"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Code2, Copy, Image as ImageIcon, KeyRound, Terminal, Video } from "lucide-react";

type TabKey = "model" | "mcp";

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "model", label: "模型调用", icon: Code2 },
  { key: "mcp", label: "MCP 接入", icon: Terminal },
];

const modelEndpoints = [
  { method: "GET", path: "/api/v1/models", text: "查询可用模型、参数和默认价格" },
  { method: "GET/POST", path: "/api/v1/pricing/estimate", text: "按模型参数查询预计消耗积分" },
  { method: "POST", path: "/api/v1/images/generations", text: "图片生成" },
  { method: "POST", path: "/api/v1/videos/generations", text: "视频生成" },
  { method: "GET", path: "/api/v1/jobs/{id}", text: "异步任务查询、刷新结果" },
];

function modelListCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/models \\
  -H "Authorization: Bearer ${token}"`;
}

function priceCurl(token: string) {
  return `curl "https://aiyes.vip/api/v1/pricing/estimate?model=seedance2&duration=10&video_model=fast&resolution=720p" \\
  -H "Authorization: Bearer ${token}"`;
}

function imageCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/images/generations \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-image-2",
    "prompt": "一张未来城市夜景插画，霓虹灯光，电影感构图，高级质感",
    "size": "1K",
    "quality": "medium",
    "async": true
  }'`;
}

function videoCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/videos/generations \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "seedance2",
    "prompt": "一条 10 秒的未来城市穿行动画，镜头推近，光线高级",
    "aspect_ratio": "9:16",
    "duration": 10,
    "video_model": "fast",
    "resolution": "720p",
    "async": true
  }'`;
}

function jobCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/jobs/job_xxx \\
  -H "Authorization: Bearer ${token}"`;
}

function mcpListCurl(token: string) {
  return `curl https://aiyes.vip/api/mcp \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'`;
}

const tokenPlaceholder = "ak_xxx";

export function HomeApiSection({
  initialApiToken = null,
  initialTokenName = null,
  isLoggedIn = false,
}: {
  initialApiToken?: string | null;
  initialTokenName?: string | null;
  isLoggedIn?: boolean;
}) {
  const [active, setActive] = useState<TabKey>("model");
  const [copied, setCopied] = useState<string | null>(null);
  const apiToken = initialApiToken;
  const tokenName = initialTokenName;
  const displayToken = apiToken || tokenPlaceholder;

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <section id="api" className="bg-slate-950 px-6 py-20 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[380px_1fr]">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-950">
            <Code2 className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-medium text-cyan-200">API 接入</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">模型调用和任务查询都在这里接</h2>
          <p className="mt-5 leading-7 text-slate-300">
            模型生成、任务查询和 MCP JSON-RPC 接入都使用 Aiyes API Key。登录后可在这里复制稳定 token，直接放到请求头里调用。
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <Fact icon={ImageIcon} label="图片模型" value="openai/gpt-image-2" />
            <Fact icon={Video} label="视频模型" value="seedance2" />
            <Fact icon={Terminal} label="MCP 接入" value="Streamable HTTP JSON-RPC" />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <TokenPanel
            token={apiToken}
            displayToken={displayToken}
            tokenName={tokenName}
            isLoggedIn={isLoggedIn}
            copied={copied}
            onCopy={copy}
          />
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/[0.03] p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                    selected
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="p-5 md:p-6">
            {active === "model" && <ModelPanel token={displayToken} copied={copied} onCopy={copy} />}
            {active === "mcp" && <McpPanel token={displayToken} copied={copied} onCopy={copy} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function TokenPanel({
  token,
  displayToken,
  tokenName,
  isLoggedIn,
  copied,
  onCopy,
}: {
  token: string | null;
  displayToken: string;
  tokenName: string | null;
  isLoggedIn: boolean;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  return (
    <div className="border-b border-white/10 bg-black/20 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
            <KeyRound className="h-4 w-4" />
            用户端稳定 Token
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            复制下面的 token，把它放到请求头：<span className="font-mono text-white">Authorization: Bearer YOUR_TOKEN</span>。示例代码会自动使用这个 token。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isLoggedIn && (
            <a href="/login?tab=login&next=/api-docs" className="inline-flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-slate-950">
              登录后查看
            </a>
          )}
          {isLoggedIn && !token && <span className="text-sm text-slate-400">正在准备 Token</span>}
        </div>
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-slate-950 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{tokenName || (token ? "当前可用 Token" : "Token 示例")}</p>
            <code className="mt-1 block break-all font-mono text-sm text-slate-100">{displayToken}</code>
          </div>
          <button
            type="button"
            onClick={() => onCopy("api-token", displayToken)}
            disabled={!token}
            title={token ? "复制稳定 Token" : "请先登录并创建 Token"}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied === "api-token" ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied === "api-token" ? "已复制" : "复制 Token"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          新用户注册后会自动生成一个 `ak_...` 稳定 token。泄露后请到 API Key 页面删除或重建；额度和调用次数也在 API Key 页面调整。
        </p>
      </div>
    </div>
  );
}

function ModelPanel({ token, copied, onCopy }: CopyProps & { token: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader
        title="模型怎么调用"
        text="先复制上方稳定 token，再把它放进 Authorization 请求头。模型列表会返回参数和默认价格，价格预估接口可按实际参数计算积分。"
      />
      <EndpointList endpoints={modelEndpoints} />
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeBlock id="models" title="查询可用模型" code={modelListCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="price" title="查询价格预估" code={priceCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="job" title="查询任务结果" code={jobCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="image" title="图片生成" code={imageCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="video" title="视频生成" code={videoCurl(token)} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

function McpPanel({ token, copied, onCopy }: CopyProps & { token: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader
        title="MCP 怎么接"
        text="MCP 入口为 Streamable HTTP JSON-RPC，使用平台 API Key 授权，工具列表由账号权限决定。"
      />
      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <p className="text-slate-500">Endpoint</p>
          <p className="mt-1 font-mono text-white">POST https://aiyes.vip/api/mcp</p>
        </div>
        <div>
          <p className="text-slate-500">Auth</p>
          <p className="mt-1 break-all font-mono text-white">Authorization: Bearer {token}</p>
        </div>
      </div>
      <div className="grid gap-4">
        <CodeBlock id="mcp-list" title="列出 MCP 工具" code={mcpListCurl(token)} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

type CopyProps = {
  copied: string | null;
  onCopy: (id: string, text: string) => void;
};

function PanelHeader({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-2 leading-7 text-slate-300">{text}</p>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="mt-2 leading-6 text-white">{value}</p>
    </div>
  );
}

function EndpointList({ endpoints }: { endpoints: Array<{ method: string; path: string; text: string }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      {endpoints.map((endpoint) => (
        <div key={endpoint.path} className="grid gap-2 border-b border-white/10 bg-black/20 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[82px_1fr_1.2fr]">
          <span className="font-mono text-cyan-200">{endpoint.method}</span>
          <span className="break-all font-mono text-white">{endpoint.path}</span>
          <span className="text-slate-300">{endpoint.text}</span>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ id, title, code, copied, onCopy }: CopyProps & { id: string; title: string; code: string }) {
  const active = copied === id;
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <button
          type="button"
          title={active ? "已复制" : "复制"}
          onClick={() => onCopy(id, code)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          {active ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-[360px] overflow-auto p-4 text-xs leading-6 text-slate-100 md:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
