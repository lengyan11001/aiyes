import { redirect } from "next/navigation";
import { RechargePanel } from "@/components/recharge-panel";
import { SiteHeader } from "@/components/site-header";
import { menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function RechargePage() {
  const user = await requireUser();
  if (!user) redirect("/login?tab=login&next=/recharge");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={menuUser(user)} />
      <section className="border-b border-white/10 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-slate-400">Account</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">账户充值</h1>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-6 py-8">
        <RechargePanel />
      </section>
    </main>
  );
}
