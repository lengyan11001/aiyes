import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Coins, Home, KeyRound, ListChecks, ReceiptText, UsersRound } from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { requireAdmin } from "@/lib/session";
import { formatPoints } from "@/lib/units";

type CmsActive = "dashboard" | "users" | "jobs" | "orders" | "ledger";

const navItems = [
  { key: "dashboard", label: "数据面板", href: "/cms", icon: BarChart3 },
  { key: "users", label: "用户管理", href: "/cms/users", icon: UsersRound },
  { key: "jobs", label: "生成记录", href: "/cms/jobs", icon: ListChecks },
  { key: "orders", label: "充值列表", href: "/cms/orders", icon: ReceiptText },
  { key: "ledger", label: "资金流水", href: "/cms/ledger", icon: Coins },
] as const;

export async function CmsShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: CmsActive;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/login?tab=login&next=/cms");

  const menuUser = {
    name: admin.name,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    balanceCents: admin.balanceCents,
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-slate-950 text-white lg:block">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/cms" className="text-xl font-semibold">Aiyes CMS</Link>
        </div>
        <nav className="space-y-1 px-3 py-4 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${
                  selected ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4 text-xs text-slate-400">
          <Link href="/generate" className="inline-flex items-center gap-2 hover:text-white">
            <Home className="h-4 w-4" />
            返回网站
          </Link>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-[200] flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 sm:inline-flex">
              管理员余额 {formatPoints(admin.balanceCents)}
            </span>
            <Link
              href="/console"
              className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-slate-300 md:inline-flex"
            >
              <KeyRound className="h-4 w-4" />
              API Key
            </Link>
            <UserMenu user={menuUser} />
          </div>
        </header>
        <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto text-sm">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-2 ${active === item.key ? "bg-slate-950 text-white" : "text-slate-600"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="px-4 py-6 lg:px-6">{children}</div>
      </section>
    </main>
  );
}
