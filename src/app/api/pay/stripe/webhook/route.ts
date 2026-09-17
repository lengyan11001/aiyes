import { createHmac, timingSafeEqual } from "node:crypto";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { stripeEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { reconcileStripeOrder, stripeSessionIdForOrder } from "@/lib/stripe-pay";

const SIGNATURE_TOLERANCE_SECONDS = 300;

interface StripeEventPayload {
  id?: string;
  type?: string;
  data?: { object?: { id?: string; metadata?: Record<string, string> | null } };
}

function parseSignatureHeader(header: string) {
  const values: Record<string, string[]> = {};
  for (const chunk of header.split(",")) {
    const [rawKey, rawValue] = chunk.split("=", 2);
    const key = (rawKey || "").trim();
    const value = (rawValue || "").trim();
    if (!key || !value) continue;
    values[key] = [...(values[key] || []), value];
  }
  return {
    timestamp: Number(values.t?.[0] || 0),
    signatures: values.v1 || [],
  };
}

function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header || !secret) return false;
  const { timestamp, signatures } = parseSignatureHeader(header);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"),
    "utf8",
  );
  return signatures.some((signature) => {
    const candidate = Buffer.from(signature, "utf8");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

/**
 * Stripe callback for top-ups started on 5vips.com. The session is re-read from
 * the Stripe API (never trusted from the body alone) before any credit happens,
 * mirroring the pay.5vips.com cashier behaviour.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!stripeEnv.webhookSecret) {
    return NextResponse.json({ ok: false, message: "Stripe webhook 未配置。" }, { status: 503 });
  }
  if (!verifyStripeSignature(body, request.headers.get("stripe-signature"), stripeEnv.webhookSecret)) {
    return NextResponse.json({ ok: false, message: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEventPayload;
  try {
    event = JSON.parse(body) as StripeEventPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
  }

  const sessionId = String(event.data?.object?.id || "");
  const orderId = String(event.data?.object?.metadata?.order_id || "");
  if (!sessionId || !orderId) {
    return NextResponse.json({ ok: true, ignored: "missing_order_metadata" });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "stripe" || stripeSessionIdForOrder(order) !== sessionId) {
    return NextResponse.json({ ok: true, ignored: "order_not_found" });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const result = await reconcileStripeOrder(order);
      return NextResponse.json({
        ok: true,
        status: result.order.status,
        credited: result.credited,
        reason: result.reason,
      });
    }
    if (event.type === "checkout.session.expired" && order.status === OrderStatus.PENDING) {
      await prisma.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CLOSED },
      });
      return NextResponse.json({ ok: true, status: OrderStatus.CLOSED });
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ignored: event.type || "unknown_event" });
}
