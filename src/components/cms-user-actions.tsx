"use client";

import { useState } from "react";
import { BadgeCheck, CircleDollarSign, Eye, KeyRound, Loader2, Power, X } from "lucide-react";

export function CmsCreditAction({ userId }: { userId: string }) {
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("admin adjustment");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(points), note }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "调整失败");
      setPoints(0);
      setMessage("已加积分");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调整失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-400"
          min={1}
          step={1}
          type="number"
          value={points}
          onChange={(event) => setPoints(Number(event.target.value || 0))}
          placeholder="积分"
        />
        <input
          className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-400"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="备注"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || points <= 0}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-950 px-3 text-xs font-medium text-white disabled:bg-slate-400"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
          加积分
        </button>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}

export function CmsPasswordAction({ userId }: { userId: string }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "修改失败");
      setPassword("");
      setMessage("密码已修改");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="h-9 w-40 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-blue-400"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="新密码"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || password.length < 8}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          改密码
        </button>
      </div>
      {message && <p className="text-xs text-slate-500">{message}</p>}
    </div>
  );
}

export function CmsStatusAction({ userId, status }: { userId: string; status: string }) {
  const [loading, setLoading] = useState(false);
  const nextStatus = status === "ACTIVE" ? "DISABLED" : "ACTIVE";

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "操作失败");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "操作失败");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={submit}
      className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
      {status === "ACTIVE" ? "禁用" : "启用"}
    </button>
  );
}

type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

type Verification = {
  id: string;
  status: VerificationStatus;
  imageUrl: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const verificationText: Record<VerificationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已认证",
  REJECTED: "未通过",
};

const verificationClass: Record<VerificationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

export function CmsVerificationAction({
  userId,
  username,
  verification,
}: {
  userId: string;
  username: string;
  verification: Verification | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<VerificationStatus | null>(null);
  const [rejectReason, setRejectReason] = useState(verification?.rejectReason || "");
  const [message, setMessage] = useState("");

  async function review(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/company-verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectReason }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "审核失败");
      setMessage(status === "APPROVED" ? "已通过认证" : "已驳回认证");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审核失败");
      setLoading(null);
    }
  }

  if (!verification) {
    return <span className="inline-flex rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">未提交</span>;
  }

  return (
    <>
      <div className="grid gap-2">
        <span className={`inline-flex w-fit rounded px-2 py-1 text-xs ${verificationClass[verification.status]}`}>
          {verificationText[verification.status]}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-fit items-center gap-1 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:border-slate-400"
        >
          <Eye className="h-3.5 w-3.5" />
          查看/审核
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white text-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">企业认证审核</h2>
                <p className="mt-1 text-sm text-slate-500">{username}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_260px]">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={verification.imageUrl} alt={`${username} 企业认证图片`} className="max-h-[520px] w-full object-contain" />
              </div>
              <div>
                <div className="rounded-lg border border-slate-200 p-4 text-sm">
                  <p className="text-slate-500">当前状态</p>
                  <p className="mt-1 font-medium">{verificationText[verification.status]}</p>
                  <p className="mt-4 text-slate-500">提交时间</p>
                  <p className="mt-1">{new Date(verification.createdAt).toLocaleString("zh-CN")}</p>
                  <p className="mt-4 text-slate-500">审核时间</p>
                  <p className="mt-1">{verification.reviewedAt ? new Date(verification.reviewedAt).toLocaleString("zh-CN") : "-"}</p>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  className="mt-4 h-24 w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-blue-400"
                  placeholder="不通过原因，可选"
                />
                {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => review("APPROVED")}
                    disabled={Boolean(loading)}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {loading === "APPROVED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    通过
                  </button>
                  <button
                    type="button"
                    onClick={() => review("REJECTED")}
                    disabled={Boolean(loading)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-4 text-sm font-medium text-rose-700 disabled:opacity-60"
                  >
                    {loading === "REJECTED" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    不通过
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
