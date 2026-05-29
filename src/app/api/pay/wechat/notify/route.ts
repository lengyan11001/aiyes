import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/billing";
import { parseWechatNotify } from "@/lib/wechat-pay";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const event = await parseWechatNotify(request.headers, body);
    if (event.event_type === "TRANSACTION.SUCCESS" || event.trade.trade_state === "SUCCESS") {
      await markOrderPaid({
        orderId: event.trade.out_trade_no,
        paidAmountCents: event.trade.amount?.total ?? 0,
        transactionId: event.trade.transaction_id,
        raw: event.raw as never,
      });
    }
    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    return NextResponse.json(
      { code: "FAIL", message: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
