"use client";

import { useState } from "react";
import { CircleDollarSign, Loader2 } from "lucide-react";

export function AdminCreditForm({ userId }: { userId: string }) {
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
      setMessage("已调整");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "调整失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="h-9 w-24 rounded-md border border-slate-300 px-2 text-sm"
        min={1}
        step={1}
        type="number"
        value={points}
        onChange={(event) => setPoints(Number(event.target.value || 0))}
        placeholder="积分"
      />
      <input
        className="h-9 w-36 rounded-md border border-slate-300 px-2 text-sm"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || points <= 0}
        className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-950 px-3 text-xs font-medium text-white disabled:bg-slate-400"
        title="手动增加积分"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
        加款
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
