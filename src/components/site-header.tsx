"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RechargeDialog } from "@/components/recharge-dialog";
import { UserMenu, type MenuUser } from "@/components/user-menu";

type NavItem = {
  label: string;
  href: string;
  match?: string;
};

const navItems: NavItem[] = [
  { label: "首页", href: "/", match: "/" },
  { label: "图片/视频生成", href: "/generate", match: "/generate" },
  { label: "API接入", href: "/api-docs", match: "/api-docs" },
  { label: "FAQ", href: "/faq", match: "/faq" },
  { label: "协议", href: "/terms", match: "/terms" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "/") return pathname === "/";
  return item.match ? pathname.startsWith(item.match) : false;
}

export function SiteHeader({ user }: { user: MenuUser | null }) {
  const pathname = usePathname();
  const [rechargeOpen, setRechargeOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[200] border-b border-white/10 bg-slate-950/92 text-white backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Aiyes
          </Link>
          <nav className="hidden items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] p-1 text-sm text-slate-300 lg:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded px-4 py-2 font-medium ${
                    active ? "bg-white text-slate-950 shadow-sm" : "hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setRechargeOpen(true)}
                  className="hidden rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 sm:inline-flex"
                >
                  充值
                </button>
                <UserMenu user={user} onRecharge={() => setRechargeOpen(true)} />
              </>
            ) : (
              <>
                <Link href="/login?tab=login" className="hidden text-sm text-slate-300 hover:text-white sm:block">
                  登录
                </Link>
                <Link href="/login?tab=register" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <RechargeDialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
    </>
  );
}
