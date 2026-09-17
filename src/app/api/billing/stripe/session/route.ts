import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { env, stripeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  STRIPE_CHECKOUT_SOURCE,
  reconcileStripeOrder,
  retrieveStripeCheckoutSession,
  stripeSessionIdForOrder,
  type StripeCheckoutSession,
} from "@/lib/stripe-pay";

/**
 * Read-only view of one Checkout Session for the pay.5vips.com cashier page.
 * The session id is unguessable (`cs_live_...`), which is the same trust model
 * the 123vips cashier uses, so this endpoint is intentionally public but only
 * ever exposes sessions tagged with {@link STRIPE_CHECKOUT_SOURCE}.
 */
function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowOrigin = stripeEnv.allowedOrigins.includes(origin)
    ? origin
    : stripeEnv.allowedOrigins[0] || "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function payResponse(payload: unknown, status: number, request: Request) {
  return NextResponse.json(payload, { status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = (url.searchParams.get("sid") || "").trim();
  if (!sessionId.startsWith("cs_")) {
    return payResponse({ ok: false, message: "支付会话不存在。" }, 404, request);
  }

  let session: StripeCheckoutSession;
  try {
    session = await retrieveStripeCheckoutSession(sessionId);
  } catch (error) {
    return payResponse(
      { ok: false, message: error instanceof Error ? error.message : "支付会话不存在。" },
      404,
      request,
    );
  }

  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (metadata.source !== STRIPE_CHECKOUT_SOURCE || !metadata.order_id) {
    return payResponse({ ok: false, message: "支付会话不存在。" }, 404, request);
  }

  let order = await prisma.order.findUnique({ where: { id: metadata.order_id } });
  if (!order || order.provider !== "stripe" || stripeSessionIdForOrder(order) !== session.id) {
    return payResponse({ ok: false, message: "支付会话不存在。" }, 404, request);
  }

  let credited = false;
  if (order.status === OrderStatus.PENDING && session.payment_status === "paid") {
    try {
      const result = await reconcileStripeOrder(order, { session });
      order = result.order;
      credited = result.credited || order.status === OrderStatus.PAID;
    } catch {
      // The cashier keeps polling; a failed credit is retried by the site.
    }
  }

  const paid = order.status === OrderStatus.PAID;
  const expired = session.status === "expired";
  return payResponse(
    {
      ok: true,
      orderId: order.id,
      sessionId: session.id,
      paid,
      credited,
      expired,
      status: paid ? "paid" : expired ? "expired" : session.payment_status || session.status || "pending",
      amountCents: order.amountCents,
      amountText: (order.amountCents / 100).toFixed(2),
      currency: String(session.currency || stripeEnv.currency).toUpperCase(),
      creditsCents: order.creditsCents,
      checkoutUrl: session.url || null,
      returnUrl: `${env.APP_URL.replace(/\/+$/, "")}/recharge`,
    },
    200,
    request,
  );
}
