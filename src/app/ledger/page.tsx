import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getUserLedgers, ledgerName, menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";
import { formatPoints } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function LedgerPage() {
  const user = await requireUser();
  if (!user) redirect("/login?tab=login&next=/ledger");
  const ledgers = await getUserLedgers(user.id);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={menuUser(user)} />
      <section className="border-b border-white/10 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-slate-400">Account</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">资金流水</h1>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-slate-400">
              <tr>
                <th className="p-3">类型</th>
                <th className="p-3">积分变动</th>
                <th className="p-3">余额</th>
                <th className="p-3">备注</th>
                <th className="p-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {ledgers.length === 0 && (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={5}>暂无流水</td>
                </tr>
              )}
              {ledgers.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="p-3">{ledgerName(row.type)}</td>
                  <td className={`p-3 font-medium ${row.amountCents >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.amountCents > 0 ? "+" : ""}{formatPoints(row.amountCents)}
                  </td>
                  <td className="p-3">{formatPoints(row.balanceAfter)}</td>
                  <td className="p-3 text-slate-300">{row.model || row.note || "-"}</td>
                  <td className="p-3 text-slate-400">{row.createdAt.toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
