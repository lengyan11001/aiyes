"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { UserMenu, type MenuUser } from "@/components/user-menu";
import { goToCashier } from "@/lib/recharge-client";
import { formatPoints } from "@/lib/units";

type ActiveTab = "generate" | "recharge" | "keys";

function navClass(active: boolean) {
  return active
    ? "relative font-medium text-violet-700 after:absolute after:-bottom-5 after:left-0 after:h-1 after:w-full after:rounded-full after:bg-violet-600"
    : "text-slate-600 hover:text-violet-700";
}

export function AppNav({ user, active }: { user: MenuUser; active?: ActiveTab }) {
  const [starting, setStarting] = useState(false);

  // 充值直接跳 pay.5vips.com 收银台，不再弹出站内充值弹窗。
  const startTopUp = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      await goToCashier();
    } catch {
      window.location.assign("/recharge");
    } finally {
      setStarting(false);
    }
  }, [starting]);

  return (
    <header className="relative z-[200] flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/generate" className={navClass(active === "generate")}>
          图片/视频生成
        </Link>
        <button
          type="button"
          onClick={() => void startTopUp()}
          disabled={starting}
          className={navClass(active === "recharge")}
        >
          {starting ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              跳转中
            </span>
          ) : (
            "充值"
          )}
        </button>
        <Link href="/console" className={navClass(active === "keys")}>
          API Key
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700 sm:inline-flex">
          余额 {formatPoints(user.balanceCents)}
        </span>
        <UserMenu user={user} onRecharge={() => void startTopUp()} />
      </div>
    </header>
  );
}
