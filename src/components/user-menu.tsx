"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  FileText,
  KeyRound,
  Loader2,
  LogOut,
  MonitorPlay,
  ReceiptText,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { formatPoints } from "@/lib/units";

export type MenuUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  balanceCents: number;
  companyVerificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export function UserMenu({ user, onRecharge }: { user: MenuUser; onRecharge?: () => void }) {
  const [open, setOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const name = user.name || user.username || user.email || "账号";
  const initial = name.slice(0, 1).toUpperCase();
  const verified = user.companyVerificationStatus === "APPROVED";

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
            {verified ? (
              <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-emerald-200">
                <span className="flex items-center gap-3">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  企业已认证
                </span>
                <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[11px] text-emerald-200">已认证</span>
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setOpen(false);
                  setVerificationOpen(true);
                }}
              >
                <Building2 className="h-4 w-4 text-slate-400" />
                企业认证
              </button>
            )}
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
      <CompanyVerificationDialog
        open={verificationOpen}
        onClose={() => setVerificationOpen(false)}
        onVerified={() => {
          setVerificationOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}

function CompanyVerificationDialog({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setMessage("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : "");
  }

  async function submit() {
    if (!file) {
      setMessage("请先上传企业认证图片。");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/company-verification", { method: "POST", body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "认证失败");
      setMessage("企业认证已通过。");
      window.setTimeout(onVerified, 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "认证失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">企业认证</h2>
            <p className="mt-1 text-sm text-slate-400">上传企业相关图片后自动通过认证。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-48 w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/[0.04] text-slate-300 hover:border-white/40 hover:bg-white/[0.07]"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="企业认证预览" className="max-h-64 w-full object-contain" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400" />
                <span className="mt-3 text-sm">上传认证图片</span>
                <span className="mt-1 text-xs text-slate-500">PNG / JPG / WEBP，最大 10MB</span>
              </>
            )}
          </button>
          <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={selectFile} />
          {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-white/30 hover:text-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading || !file}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              提交认证
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
