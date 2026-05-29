"use client";

import { useState } from "react";
import { Copy, Loader2, Save, Trash2 } from "lucide-react";
import { formatPoints } from "@/lib/units";

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  secretPlain: string | null;
  status: string;
  quotaCents: number | null;
  requestLimit: number | null;
  usedCents: number;
  usedRequests: number;
  createdAt: string | Date;
  lastUsedAt: string | Date | null;
};

function numberValue(value: number | null) {
  return value === null ? "" : String(value);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.trunc(next) : null;
}

function dateText(value: string | Date | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function limitText(used: number, limit: number | null, unit: string) {
  if (limit === null) return `${used.toLocaleString("zh-CN")} / 不限${unit}`;
  return `${used.toLocaleString("zh-CN")} / ${limit.toLocaleString("zh-CN")}${unit}`;
}

export function CreateKeyForm({
  initialKeys = [],
  tone = "light",
}: {
  initialKeys?: ApiKeyItem[];
  tone?: "light" | "dark";
}) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [name, setName] = useState("默认子 Key");
  const [quotaCents, setQuotaCents] = useState("");
  const [requestLimit, setRequestLimit] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; quotaCents: string; requestLimit: string }>>(() =>
    Object.fromEntries(
      initialKeys.map((key) => [
        key.id,
        {
          name: key.name,
          quotaCents: numberValue(key.quotaCents),
          requestLimit: numberValue(key.requestLimit),
        },
      ]),
    ),
  );
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dark = tone === "dark";
  const inputClass = `h-10 rounded-md border px-3 text-sm outline-none ${
    dark
      ? "border-white/10 bg-slate-950 text-white placeholder:text-slate-500 focus:border-white/40"
      : "border-slate-300 bg-white text-slate-950 focus:border-slate-950"
  }`;

  function upsertDraft(key: ApiKeyItem) {
    setDrafts((current) => ({
      ...current,
      [key.id]: {
        name: key.name,
        quotaCents: numberValue(key.quotaCents),
        requestLimit: numberValue(key.requestLimit),
      },
    }));
  }

  async function submit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quotaCents: parseOptionalNumber(quotaCents),
          requestLimit: parseOptionalNumber(requestLimit),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "创建失败");
      setKeys((current) => [payload.key, ...current]);
      upsertDraft(payload.key);
      setName("默认子 Key");
      setQuotaCents("");
      setRequestLimit("");
      setMessage("API Key 已创建，已直接加入列表。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function save(keyId: string) {
    const draft = drafts[keyId];
    if (!draft) return;
    setSavingId(keyId);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          quotaCents: parseOptionalNumber(draft.quotaCents),
          requestLimit: parseOptionalNumber(draft.requestLimit),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "保存失败");
      setKeys((current) => current.map((key) => (key.id === keyId ? payload.key : key)));
      upsertDraft(payload.key);
      setMessage("额度和次数已更新。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId("");
    }
  }

  async function remove(keyId: string) {
    if (!window.confirm("确认删除这个 API Key？删除后不能继续调用。")) return;
    setDeletingId(keyId);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "删除失败");
      setKeys((current) => current.filter((key) => key.id !== keyId));
      setDrafts((current) => {
        const next = { ...current };
        delete next[keyId];
        return next;
      });
      setMessage("API Key 已删除。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId("");
    }
  }

  async function copyKey(key: ApiKeyItem) {
    const value = key.secretPlain || `${key.prefix}...${key.last4}`;
    await navigator.clipboard.writeText(value);
    setCopiedId(key.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  }

  return (
    <div className="mt-5">
      <div className={`rounded-md p-4 ${dark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Key 名称" />
          <input
            className={inputClass}
            value={quotaCents}
            inputMode="numeric"
            onChange={(event) => setQuotaCents(event.target.value)}
            placeholder="积分额度，不填为不限"
          />
          <input
            className={inputClass}
            value={requestLimit}
            inputMode="numeric"
            onChange={(event) => setRequestLimit(event.target.value)}
            placeholder="调用次数，不填为不限"
          />
          <button
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50 ${
              dark ? "bg-white text-slate-950" : "bg-slate-950 text-white"
            }`}
            type="button"
            disabled={loading}
            onClick={submit}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            创建 Key
          </button>
        </div>
        <p className={`mt-3 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          子 Key 与父账号共享余额；这里设置的是单个 Key 的消费积分上限和生成调用次数上限。
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-white/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.04] text-slate-400">
            <tr>
              <th className="p-3">名称</th>
              <th className="p-3">Key</th>
              <th className="p-3">积分额度</th>
              <th className="p-3">调用次数</th>
              <th className="p-3">最后使用</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td className="p-4 text-slate-400" colSpan={6}>
                  暂无 API Key
                </td>
              </tr>
            )}
            {keys.map((key) => {
              const draft = drafts[key.id] ?? {
                name: key.name,
                quotaCents: numberValue(key.quotaCents),
                requestLimit: numberValue(key.requestLimit),
              };
              return (
                <tr key={key.id} className="border-t border-white/10 align-top">
                  <td className="p-3">
                    <input
                      className={`${inputClass} w-44`}
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [key.id]: { ...draft, name: event.target.value },
                        }))
                      }
                    />
                    <p className="mt-2 text-xs text-slate-500">创建：{dateText(key.createdAt)}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex max-w-[360px] items-center gap-2 rounded-md bg-slate-950 px-2 py-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">
                        {key.secretPlain || `${key.prefix}...${key.last4}`}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyKey(key)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                        title="复制 API Key"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {copiedId === key.id && <p className="mt-1 text-xs text-emerald-300">已复制</p>}
                  </td>
                  <td className="p-3">
                    <input
                      className={`${inputClass} w-36`}
                      value={draft.quotaCents}
                      inputMode="numeric"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [key.id]: { ...draft, quotaCents: event.target.value },
                        }))
                      }
                      placeholder="不限"
                    />
                    <p className="mt-2 text-xs text-slate-500">{limitText(key.usedCents, key.quotaCents, " 积分")}</p>
                    {key.quotaCents !== null && (
                      <p className="mt-1 text-xs text-slate-500">剩余 {formatPoints(Math.max(key.quotaCents - key.usedCents, 0))}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      className={`${inputClass} w-32`}
                      value={draft.requestLimit}
                      inputMode="numeric"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [key.id]: { ...draft, requestLimit: event.target.value },
                        }))
                      }
                      placeholder="不限"
                    />
                    <p className="mt-2 text-xs text-slate-500">{limitText(key.usedRequests, key.requestLimit, " 次")}</p>
                  </td>
                  <td className="p-3 text-slate-400">{dateText(key.lastUsedAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={savingId === key.id}
                        onClick={() => save(key.id)}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-60"
                      >
                        {savingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        保存
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === key.id}
                        onClick={() => remove(key.id)}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-300/20 px-3 text-xs text-rose-200 hover:bg-rose-300/10 disabled:opacity-60"
                      >
                        {deletingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
