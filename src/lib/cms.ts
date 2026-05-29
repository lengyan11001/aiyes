import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function cmsDate(value: Date | string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orderStatusText(status: string) {
  if (status === "PAID") return "已支付";
  if (status === "PENDING") return "待支付";
  if (status === "CLOSED") return "已关闭";
  if (status === "REFUNDED") return "已退款";
  if (status === "FAILED") return "失败";
  return status;
}

export function jobStatusText(status: string) {
  if (status === "COMPLETED") return "已完成";
  if (status === "PROCESSING") return "处理中";
  if (status === "PENDING") return "排队中";
  if (status === "FAILED") return "失败";
  if (status === "CANCELED") return "已取消";
  return status;
}

export function ledgerTypeText(type: string) {
  if (type === "CREDIT") return "入账";
  if (type === "DEBIT") return "扣费";
  if (type === "REFUND") return "退款";
  if (type === "ADJUSTMENT") return "调整";
  return type;
}

export async function getCmsStats() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [
    users,
    activeUsers,
    jobs,
    todayJobs,
    pendingJobs,
    paidOrders,
    paidAmount,
    usage,
    balances,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.generationJob.count(),
    prisma.generationJob.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.generationJob.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.order.count({ where: { status: OrderStatus.PAID } }),
    prisma.order.aggregate({ where: { status: OrderStatus.PAID }, _sum: { amountCents: true } }),
    prisma.usageLedger.aggregate({ where: { type: "DEBIT" }, _sum: { amountCents: true } }),
    prisma.user.aggregate({ _sum: { balanceCents: true } }),
  ]);

  return {
    users,
    activeUsers,
    jobs,
    todayJobs,
    pendingJobs,
    paidOrders,
    paidAmountCents: paidAmount._sum.amountCents ?? 0,
    usedPoints: Math.abs(usage._sum.amountCents ?? 0),
    balancePoints: balances._sum.balanceCents ?? 0,
  };
}
