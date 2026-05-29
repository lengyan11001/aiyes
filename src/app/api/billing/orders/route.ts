import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { RECHARGE_TIERS_POINTS } from "@/lib/units";
import { createWechatNativePayment } from "@/lib/wechat-pay";

const schema = z.object({
  amountCents: z.number().int().refine((amount) => RECHARGE_TIERS_POINTS.includes(amount), {
    message: "unsupported_recharge_amount",
  }),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
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
      provider: "wechat_native",
      status: OrderStatus.PENDING,
    },
  });

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
