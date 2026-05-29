import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateKeyForm } from "@/components/create-key-form";
import { SiteHeader } from "@/components/site-header";
import { getUserApiKeys, menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ApiKeysPage() {
  const user = await requireUser();
  if (!user) redirect("/login?tab=login&next=/api-keys");
  const keys = await getUserApiKeys(user.id);
  const clientKeys = keys.map((key) => ({
    ...key,
    createdAt: key.createdAt.toISOString(),
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={menuUser(user)} />
      <section className="border-b border-white/10 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">Account</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">API Key</h1>
          </div>
          <Link href="/generate" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950">
            进入生成
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <div>
            <h2 className="text-xl font-semibold">平台 API Key</h2>
            <p className="mt-1 text-sm text-slate-400">
              创建子 Key 后会直接出现在列表，可复制、设置积分额度和调用次数，也可以随时修改或删除。
            </p>
          </div>
          <CreateKeyForm initialKeys={clientKeys} tone="dark" />
        </div>
      </section>
    </main>
  );
}
