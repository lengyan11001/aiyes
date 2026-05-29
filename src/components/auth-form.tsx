"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState(params.get("tab") === "register" ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "操作失败");
      const next = params.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/generate";
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
      <div className="mb-5 grid grid-cols-2 rounded-md bg-white/[0.04] p-1 text-sm">
        <button
          type="button"
          className={`rounded px-3 py-2 ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          type="button"
          className={`rounded px-3 py-2 ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>
      <label className="mb-4 block text-sm">
        <span className="text-slate-300">账号</span>
        <input
          autoComplete="username"
          className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white outline-none focus:border-white/40"
          placeholder="输入账号"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="mb-5 block text-sm">
        <span className="text-slate-300">密码</span>
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-1 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-white outline-none focus:border-white/40"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}
      <button disabled={loading} className="h-11 w-full rounded-md bg-white font-medium text-slate-950 disabled:opacity-50">
        {loading ? "处理中" : mode === "login" ? "登录" : "创建账号"}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        {mode === "register" ? "注册即表示同意" : "登录即表示已阅读并同意"}
        <Link href="/terms" className="mx-1 text-slate-300 hover:text-white">
          用户协议
        </Link>
        和
        <Link href="/privacy" className="mx-1 text-slate-300 hover:text-white">
          隐私协议
        </Link>
      </p>
    </form>
  );
}
