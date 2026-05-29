"use client";

import Link from "next/link";
import { useState } from "react";
import { RechargeDialog } from "@/components/recharge-dialog";
import { UserMenu, type MenuUser } from "@/components/user-menu";
import { formatPoints } from "@/lib/units";

type ActiveTab = "generate" | "recharge" | "keys";

function navClass(active: boolean) {
  return active
    ? "relative font-medium text-violet-700 after:absolute after:-bottom-5 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-violet-600"
    : "text-slate-600 hover:text-violet-700";
}

export function AppNav({ user, active }: { user: MenuUser; active?: ActiveTab }) {
  const [rechargeOpen, setRechargeOpen] = useState(false);

  return (
    <>
      <header className="relative z-[200] flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/generate" className={navClass(active === "generate")}>
            图片/视频生成
          </Link>
          <button type="button" onClick={() => setRechargeOpen(true)} className={navClass(active === "recharge")}>
            充值
          </button>
          <Link href="/console" className={navClass(active === "keys")}>
            API Key
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 sm:inline-flex">
            余额 {formatPoints(user.balanceCents)}
          </span>
          <UserMenu user={user} onRecharge={() => setRechargeOpen(true)} />
        </div>
      </header>
      <RechargeDialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
    </>
  );
}
