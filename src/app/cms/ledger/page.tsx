import { CmsShell } from "@/components/cms-shell";
import { cmsDate, ledgerTypeText } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { formatPoints } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CmsLedgerPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const type = params.type || "";
  const ledgers = await prisma.usageLedger.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(q
        ? {
            OR: [
              { note: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { user: { username: { contains: q, mode: "insensitive" } } },
              { jobId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 160,
    include: { user: { select: { username: true } } },
  });

  return (
    <CmsShell active="ledger" title="资金流水" subtitle="充值入账、管理员调整、任务扣费和退款记录">
      <form className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="q" defaultValue={q} className="h-10 w-72 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400" placeholder="搜索用户、备注、模型或任务号" />
        <select name="type" defaultValue={type} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400">
          <option value="">全部类型</option>
          <option value="CREDIT">入账</option>
          <option value="DEBIT">扣费</option>
          <option value="REFUND">退款</option>
          <option value="ADJUSTMENT">调整</option>
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" type="submit">筛选</button>
        <a className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600" href="/cms/ledger">重置</a>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">类型</th>
                <th className="p-3">积分变动</th>
                <th className="p-3">变动后余额</th>
                <th className="p-3">模型/备注</th>
                <th className="p-3">任务号</th>
                <th className="p-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={7}>暂无资金流水</td></tr>}
              {ledgers.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{row.user.username}</td>
                  <td className="p-3">{ledgerTypeText(row.type)}</td>
                  <td className={`p-3 font-medium ${row.amountCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {row.amountCents > 0 ? "+" : ""}{formatPoints(row.amountCents)}
                  </td>
                  <td className="p-3">{formatPoints(row.balanceAfter)}</td>
                  <td className="p-3">{row.model || row.note || "-"}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{row.jobId || "-"}</td>
                  <td className="p-3 text-xs text-slate-500">{cmsDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CmsShell>
  );
}
