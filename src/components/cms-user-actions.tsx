"use client";

import { useState } from "react";
import { CircleDollarSign, KeyRound, Loader2, Power } from "lucide-react";

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
