"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, FileText, KeyRound, LogOut, MonitorPlay, ReceiptText, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { formatPoints } from "@/lib/units";

export type MenuUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  balanceCents: number;
};

export function UserMenu({ user, onRecharge }: { user: MenuUser; onRecharge?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const name = user.name || user.username || user.email || "账号";
  const initial = name.slice(0, 1).toUpperCase();

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 pr-3 text-sm text-slate-200 shadow-sm hover:border-white/25"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-950">
          {initial}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-[220] mt-2 w-72 overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/50">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{name}</p>
                <p className="mt-0.5 text-xs text-slate-400">余额 {formatPoints(user.balanceCents)}</p>
              </div>
            </div>
          </div>

          <div className="p-2 text-sm">
            <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/generate">
              <MonitorPlay className="h-4 w-4 text-slate-400" />
              图片/视频生成
            </Link>
            <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/ledger">
              <ReceiptText className="h-4 w-4 text-slate-400" />
              资金流水
            </Link>
            {onRecharge ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  onRecharge();
                }}
              >
                <WalletCards className="h-4 w-4 text-slate-400" />
                账户充值
              </button>
            ) : (
              <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/recharge">
                <WalletCards className="h-4 w-4 text-slate-400" />
                账户充值
              </Link>
            )}
            <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/api-keys">
              <KeyRound className="h-4 w-4 text-slate-400" />
              API Key
            </Link>
            <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/terms">
              <FileText className="h-4 w-4 text-slate-400" />
              用户协议
            </Link>
            <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/privacy">
              <FileText className="h-4 w-4 text-slate-400" />
              隐私协议
            </Link>
            {user.role === "ADMIN" && (
              <Link className="flex items-center gap-3 rounded-md px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white" href="/cms">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                管理后台
              </Link>
            )}
            <button
              type="button"
              disabled={loggingOut}
              onClick={logout}
              className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              {loggingOut ? <UserRound className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
