import { HomeApiSection } from "@/components/home-api-section";
import { SiteHeader } from "@/components/site-header";
import { ensureUserApiKey, menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ApiDocsPage() {
  const user = await requireUser();
  const stableKey = user ? await ensureUserApiKey(user.id) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={user ? menuUser(user) : null} />
      <HomeApiSection
        initialApiToken={stableKey?.secretPlain ?? null}
        initialTokenName={stableKey?.name ?? null}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}
