import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/billing";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { queryWechatOrder } from "@/lib/wechat-pay";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const { id } = await context.params;
  const order = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!order) return jsonError("订单不存在。", 404, "not_found");
  if (order.status === OrderStatus.PAID) return NextResponse.json({ order });

  try {
    const trade = await queryWechatOrder(order.id);
    if (trade.trade_state === "SUCCESS") {
      const paidOrder = await markOrderPaid({
        orderId: order.id,
        paidAmountCents: trade.amount?.total ?? 0,
        transactionId: trade.transaction_id,
        raw: trade as never,
      });
      return NextResponse.json({ order: paidOrder, trade });
    }
    return NextResponse.json({ order, trade });
  } catch (error) {
    return NextResponse.json({
      order,
      warning: error instanceof Error ? error.message : String(error),
    });
  }
}
