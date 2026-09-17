import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isStripeConfigured } from "@/lib/env";
import {
  createStripeRechargeSession,
  reconcileStripeOrder,
  stripeCashierUrl,
  stripeRawForSession,
} from "@/lib/stripe-pay";
import { RECHARGE_TIERS_POINTS } from "@/lib/units";
import { createWechatNativePayment } from "@/lib/wechat-pay";

const schema = z.object({
  amountCents: z.number().int().refine((amount) => RECHARGE_TIERS_POINTS.includes(amount), {
    message: "unsupported_recharge_amount",
  }),
});

/** Credit any Stripe order the shared cashier has already settled. */
async function reconcilePendingStripeOrders(userId: string) {
  const pending = await prisma.order.findMany({
    where: { userId, provider: "stripe", status: OrderStatus.PENDING },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const order of pending) {
    try {
      await reconcileStripeOrder(order);
    } catch {
      // Transient Stripe/network failures are retried on the next visit.
    }
  }
}

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  await reconcilePendingStripeOrders(user.id);
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("充值金额不正确。", 422, "validation_error");

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      amountCents: parsed.data.amountCents,
      creditsCents: parsed.data.amountCents,
      title: `Aiyes 积分充值 ${parsed.data.amountCents / 100} 元`,
      provider: isStripeConfigured() ? "stripe" : "wechat_native",
      status: OrderStatus.PENDING,
    },
  });

  if (isStripeConfigured()) {
    try {
      const session = await createStripeRechargeSession({
        orderId: order.id,
        userId: user.id,
        description: order.title,
        amountCents: order.amountCents,
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          wxPrepayId: session.id,
          raw: stripeRawForSession(session) as never,
        },
      });
      return NextResponse.json({
        order: updated,
        payment: {
          provider: "stripe",
          sessionId: session.id,
          /** pay.5vips.com cashier page; it forwards to Stripe checkout. */
          checkoutUrl: stripeCashierUrl(session.id),
          hostedCheckoutUrl: session.url ?? null,
        },
      });
    } catch (error) {
      return NextResponse.json({
        order,
        payment: null,
        warning: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    const payment = await createWechatNativePayment({
      orderId: order.id,
      description: order.title,
      amountCents: order.amountCents,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { wxPrepayId: payment.codeUrl, raw: payment as never },
    });
    return NextResponse.json({ order, payment });
  } catch (error) {
    return NextResponse.json({
      order,
      payment: null,
      warning: error instanceof Error ? error.message : String(error),
    });
  }
}
