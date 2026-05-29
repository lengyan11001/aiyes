import { CmsShell } from "@/components/cms-shell";
import { cmsDate, orderStatusText } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { formatPoints, formatYuanFromFen } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CmsOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status || "";
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { wxTransactionId: { contains: q, mode: "insensitive" } },
              { user: { username: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { user: { select: { username: true } } },
  });

  return (
    <CmsShell active="orders" title="充值列表" subtitle="微信充值订单、支付状态、到账积分和交易号">
      <form className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="q" defaultValue={q} className="h-10 w-72 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400" placeholder="搜索用户、订单号或交易号" />
        <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400">
          <option value="">全部状态</option>
          <option value="PENDING">待支付</option>
          <option value="PAID">已支付</option>
          <option value="CLOSED">已关闭</option>
          <option value="REFUNDED">已退款</option>
          <option value="FAILED">失败</option>
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" type="submit">筛选</button>
        <a className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600" href="/cms/orders">重置</a>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1060px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">支付金额</th>
                <th className="p-3">到账积分</th>
                <th className="p-3">状态</th>
                <th className="p-3">订单号</th>
                <th className="p-3">微信交易号</th>
                <th className="p-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={7}>暂无充值订单</td></tr>}
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{order.user.username}</td>
                  <td className="p-3">{formatYuanFromFen(order.amountCents)}</td>
                  <td className="p-3">{formatPoints(order.creditsCents)}</td>
                  <td className="p-3">{orderStatusText(order.status)}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{order.id}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{order.wxTransactionId || "-"}</td>
                  <td className="p-3 text-xs text-slate-500">
                    <p>创建 {cmsDate(order.createdAt)}</p>
                    <p className="mt-1">支付 {cmsDate(order.paidAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CmsShell>
  );
}
