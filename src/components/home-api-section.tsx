"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Code2, Copy, Image as ImageIcon, KeyRound, ListChecks, Video } from "lucide-react";

type TabKey = "guide" | "params" | "examples" | "models";

const tokenPlaceholder = "ak_xxx";

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "guide", label: "接入要点", icon: ListChecks },
  { key: "params", label: "参数定义", icon: Code2 },
  { key: "examples", label: "调用示例", icon: Code2 },
  { key: "models", label: "模型参数", icon: Video },
];

const endpoints = [
  { method: "GET", path: "/api/v1/models", text: "模型和参数" },
  { method: "GET/POST", path: "/api/v1/pricing/estimate", text: "价格预估" },
  { method: "POST", path: "/api/v1/images/generations", text: "图片生成" },
  { method: "POST", path: "/api/v1/videos/generations", text: "视频生成" },
  { method: "GET", path: "/api/v1/jobs/{id}", text: "任务结果" },
];

const seedanceVideoModels = [
  { value: "fast", label: "快速", price: "85 积分/秒" },
  { value: "standard", label: "标准", price: "100 积分/秒" },
  { value: "fast_vip", label: "高阶快速", price: "100 积分/秒" },
  { value: "standard_vip", label: "高阶标准", price: "120 积分/秒；1080p 为 200 积分/秒" },
];

const modelRows = [
  {
    id: "seedance2",
    required: "model, prompt",
    params: "duration: 4/5/8/10/15；aspect_ratio: 16:9/21:9/9:16/1:1/4:3/3:4；video_model: fast/standard/fast_vip/standard_vip；resolution: 720p/1080p",
  },
  {
    id: "openai/gpt-image-2",
    required: "model, prompt",
    params: "size: 1K/2K/4K；quality: low/medium/high；aspect_ratio: 1:1/4:3/3:4/16:9/9:16/3:2/2:3；image_url 可选",
  },
  {
    id: "alibaba/happy-horse/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 3-15；resolution: 720p/1080p；aspect_ratio: 16:9/9:16/1:1/4:3/3:4",
  },
  {
    id: "fal-ai/sora-2/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 4/8/12/16/20；resolution: 720p；aspect_ratio: auto/16:9/9:16",
  },
  {
    id: "fal-ai/sora-2/image-to-video/pro",
    required: "model, prompt, image_url",
    params: "duration: 4/8/12/16/20；resolution: 720p/1080p；aspect_ratio: auto/16:9/9:16",
  },
  {
    id: "fal-ai/veo3.1/lite/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p；aspect_ratio: auto/16:9/9:16",
  },
  {
    id: "fal-ai/veo3.1/fast/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p/4k；aspect_ratio: auto/16:9/9:16",
  },
  {
    id: "fal-ai/veo3.1/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p/4k；aspect_ratio: auto/16:9/9:16",
  },
  {
    id: "fal-ai/kling-video/o3/standard/text-to-video",
    required: "model, prompt",
    params: "duration: 3-15；aspect_ratio: 16:9/9:16/1:1",
  },
  {
    id: "fal-ai/kling-video/o3/pro/text-to-video",
    required: "model, prompt",
    params: "duration: 3-15；aspect_ratio: 16:9/9:16/1:1",
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 6/10",
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
    required: "model, prompt, image_url",
    params: "固定档位",
  },
  {
    id: "fal-ai/vidu/q3/image-to-video",
    required: "model, prompt, image_url",
    params: "duration: 1-16；resolution: 360p/540p/720p/1080p；aspect_ratio: 16:9/9:16/4:3/3:4/1:1",
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    required: "model, prompt",
    params: "size: auto_2K/auto_4K/square_hd/portrait_16_9/landscape_16_9",
  },
  {
    id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    required: "model, prompt",
    params: "size: auto_2K/auto_3K/square_hd/portrait_16_9/landscape_16_9",
  },
  {
    id: "fal-ai/nano-banana-2",
    required: "model, prompt",
    params: "size: 0.5K/1K/2K/4K；aspect_ratio: auto/16:9/9:16/1:1/4:3/3:4；image_url 可选",
  },
  {
    id: "fal-ai/nano-banana-pro",
    required: "model, prompt",
    params: "size: 1K/2K/4K；aspect_ratio: 16:9/9:16/1:1/4:3/3:4；image_url 可选",
  },
];

const paramSections = [
  {
    title: "公共请求头",
    rows: [
      { name: "Authorization", required: "是", type: "string", values: "Bearer YOUR_TOKEN" },
      { name: "Content-Type", required: "生成接口必填", type: "string", values: "application/json" },
    ],
  },
  {
    title: "GET /api/v1/pricing/estimate",
    rows: [
      { name: "model", required: "是", type: "string", values: "模型 ID，见模型参数表" },
      { name: "duration", required: "否", type: "string | number", values: "视频时长，按模型取值传" },
      { name: "video_model", required: "否", type: "string", values: "seedance2 可传 fast / standard / fast_vip / standard_vip" },
      { name: "resolution", required: "否", type: "string", values: "720p / 1080p / 4k 等，按模型取值传" },
      { name: "size 或 image_size", required: "否", type: "string", values: "图片尺寸，按模型取值传" },
      { name: "quality", required: "否", type: "string", values: "low / medium / high" },
      { name: "aspect_ratio 或 ratio", required: "否", type: "string", values: "16:9 / 9:16 / 1:1 等，按模型取值传" },
    ],
  },
  {
    title: "POST /api/v1/images/generations",
    rows: [
      { name: "model", required: "是", type: "string", values: "图片模型 ID，见模型参数表" },
      { name: "prompt", required: "是", type: "string", values: "1-5000 字符" },
      { name: "size", required: "否", type: "string", values: "1K / 2K / 4K / auto_2K 等，按模型取值传" },
      { name: "quality", required: "否", type: "string", values: "low / medium / high" },
      { name: "aspect_ratio", required: "否", type: "string", values: "1:1 / 16:9 / 9:16 等，按模型取值传" },
      { name: "image_url", required: "否", type: "url", values: "公网可访问图片地址" },
      { name: "async", required: "否", type: "boolean", values: "true / false，建议 true" },
    ],
  },
  {
    title: "POST /api/v1/videos/generations",
    rows: [
      { name: "model", required: "是", type: "string", values: "视频模型 ID，见模型参数表" },
      { name: "prompt", required: "是", type: "string", values: "1-5000 字符" },
      { name: "image_url", required: "按模型", type: "url", values: "图生视频传公网可访问图片地址" },
      { name: "duration", required: "否", type: "string | number", values: "按模型取值传" },
      { name: "aspect_ratio 或 ratio", required: "否", type: "string", values: "16:9 / 9:16 / 1:1 等，按模型取值传" },
      { name: "resolution", required: "否", type: "string", values: "720p / 1080p / 4k 等，按模型取值传" },
      { name: "video_model", required: "否", type: "string", values: "仅 seedance2：fast / standard / fast_vip / standard_vip" },
      { name: "async", required: "否", type: "boolean", values: "true / false，建议 true" },
    ],
  },
  {
    title: "GET /api/v1/jobs/{id}",
    rows: [
      { name: "id", required: "是", type: "string", values: "生成接口返回的任务 ID" },
      { name: "job.status", required: "返回", type: "string", values: "PENDING / PROCESSING / COMPLETED / FAILED" },
      { name: "job.result", required: "返回", type: "object", values: "完成后返回生成结果" },
      { name: "job.error", required: "返回", type: "string | null", values: "失败原因" },
    ],
  },
];

function modelListCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/models \\
  -H "Authorization: Bearer ${token}"`;
}

function priceCurl(token: string) {
  return `curl "https://aiyes.vip/api/v1/pricing/estimate?model=seedance2&duration=10&video_model=fast_vip&resolution=720p&aspect_ratio=9:16" \\
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
    "aspect_ratio": "16:9",
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
    "image_url": "https://example.com/first-frame.png",
    "aspect_ratio": "9:16",
    "duration": 10,
    "video_model": "fast_vip",
    "resolution": "720p",
    "async": true
  }'`;
}

function jobCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/jobs/job_xxx \\
  -H "Authorization: Bearer ${token}"`;
}

function guideText(token: string) {
  const params = paramSections
    .map((section) => {
      const rows = section.rows
        .map((row) => `- ${row.name}: ${row.required}，${row.type}，${row.values}`)
        .join("\n");
      return `${section.title}\n${rows}`;
    })
    .join("\n\n");

  return `Aiyes API 接入要点

Base URL: https://aiyes.vip
认证: Authorization: Bearer ${token}

接口:
- GET /api/v1/models
- GET/POST /api/v1/pricing/estimate
- POST /api/v1/images/generations
- POST /api/v1/videos/generations
- GET /api/v1/jobs/{id}

seedance2 video_model:
- fast
- standard
- fast_vip
- standard_vip

图片生成必传:
- model
- prompt

视频生成必传:
- model
- prompt

图生图或图生视频:
- image_url 传公网可访问图片地址

建议:
- 生成接口传 async: true
- 返回 id 后调用 /api/v1/jobs/{id} 查询结果

参数定义:
${params}
`;
}

export function HomeApiSection({
  initialApiToken = null,
  initialTokenName = null,
  isLoggedIn = false,
}: {
  initialApiToken?: string | null;
  initialTokenName?: string | null;
  isLoggedIn?: boolean;
}) {
  const [active, setActive] = useState<TabKey>("guide");
  const [copied, setCopied] = useState<string | null>(null);
  const displayToken = initialApiToken || tokenPlaceholder;
  const guide = useMemo(() => guideText(displayToken), [displayToken]);

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
    <section id="api" className="bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[340px_1fr]">
        <aside>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-950">
            <Code2 className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-medium text-cyan-200">API 接入</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">模型接口文档</h2>
          <p className="mt-5 leading-7 text-slate-300">
            复制稳定 Token，按示例调用接口。
          </p>
          <div className="mt-7 grid gap-3 text-sm text-slate-300">
            <Fact icon={Video} label="视频参数" value="video_model: fast / standard / fast_vip / standard_vip" />
            <Fact icon={ImageIcon} label="参考图片" value="image_url" />
          </div>
        </aside>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <TokenPanel
            token={initialApiToken}
            displayToken={displayToken}
            tokenName={initialTokenName}
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
                    selected ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="p-5 md:p-6">
            {active === "guide" && <GuidePanel guide={guide} copied={copied} onCopy={copy} />}
            {active === "params" && <ParamsPanel />}
            {active === "examples" && <ExamplesPanel token={displayToken} copied={copied} onCopy={copy} />}
            {active === "models" && <ModelsPanel />}
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
            稳定 Token
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            请求头：<span className="font-mono text-white">Authorization: Bearer YOUR_TOKEN</span>
          </p>
        </div>
        {!isLoggedIn && (
          <a href="/login?tab=login&next=/api-docs" className="inline-flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-slate-950">
            登录后查看
          </a>
        )}
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-slate-950 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">{tokenName || (token ? "当前 Token" : "Token 示例")}</p>
            <code className="mt-1 block break-all font-mono text-sm text-slate-100">{displayToken}</code>
          </div>
          <button
            type="button"
            onClick={() => onCopy("api-token", displayToken)}
            disabled={!token}
            title={token ? "复制 Token" : "请先登录"}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copied === "api-token" ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied === "api-token" ? "已复制" : "复制 Token"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidePanel({ guide, copied, onCopy }: CopyProps & { guide: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader title="接入要点" />
      <button
        type="button"
        onClick={() => onCopy("guide", guide)}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-950 hover:bg-cyan-100"
      >
        {copied === "guide" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied === "guide" ? "已复制" : "复制接入要点"}
      </button>
      <CodeBlock id="guide-preview" title="接入要点" code={guide} copied={copied} onCopy={onCopy} />
    </div>
  );
}

function ExamplesPanel({ token, copied, onCopy }: CopyProps & { token: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader title="调用示例" />
      <EndpointList />
      <SeedanceNotice />
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeBlock id="models" title="模型列表" code={modelListCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="price" title="价格预估" code={priceCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="image" title="图片生成" code={imageCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="video" title="视频生成" code={videoCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="job" title="任务结果" code={jobCurl(token)} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

function ParamsPanel() {
  return (
    <div className="grid gap-5">
      <PanelHeader title="参数定义" />
      {paramSections.map((section) => (
        <ParamTable key={section.title} title={section.title} rows={section.rows} />
      ))}
    </div>
  );
}

function ModelsPanel() {
  return (
    <div className="grid gap-5">
      <PanelHeader title="模型参数" />
      <SeedanceNotice />
      <div className="overflow-hidden rounded-lg border border-white/10">
        {modelRows.map((row) => (
          <div key={row.id} className="grid gap-2 border-b border-white/10 bg-black/20 p-4 text-sm last:border-b-0">
            <code className="break-all font-mono text-cyan-100">{row.id}</code>
            <p className="text-slate-300"><span className="text-slate-500">必传：</span>{row.required}</p>
            <p className="leading-6 text-slate-300"><span className="text-slate-500">参数：</span>{row.params}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParamTable({ title, rows }: { title: string; rows: Array<{ name: string; required: string; type: string; values: string }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <h4 className="font-medium text-slate-100">{title}</h4>
      </div>
      <div className="grid bg-black/20 text-sm">
        <div className="grid gap-2 border-b border-white/10 px-4 py-3 text-xs font-medium text-slate-500 md:grid-cols-[1fr_90px_120px_2fr]">
          <span>参数</span>
          <span>必填</span>
          <span>类型</span>
          <span>取值</span>
        </div>
        {rows.map((row) => (
          <div key={`${title}-${row.name}`} className="grid gap-2 border-b border-white/10 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_90px_120px_2fr]">
            <code className="break-all font-mono text-cyan-100">{row.name}</code>
            <span className="text-slate-300">{row.required}</span>
            <span className="font-mono text-slate-300">{row.type}</span>
            <span className="leading-6 text-slate-300">{row.values}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type CopyProps = {
  copied: string | null;
  onCopy: (id: string, text: string) => void;
};

function PanelHeader({ title }: { title: string }) {
  return <h3 className="text-2xl font-semibold">{title}</h3>;
}

function SeedanceNotice() {
  return (
    <div className="rounded-lg border border-cyan-200/20 bg-cyan-200/10 p-4">
      <p className="font-medium text-cyan-100">seedance2 video_model</p>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {seedanceVideoModels.map((item) => (
          <div key={item.value} className="rounded-md border border-white/10 bg-slate-950/70 p-3">
            <code className="font-mono text-white">{item.value}</code>
            <p className="mt-1 text-slate-300">{item.label}，{item.price}</p>
          </div>
        ))}
      </div>
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
      <p className="mt-2 break-words leading-6 text-white">{value}</p>
    </div>
  );
}

function EndpointList() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      {endpoints.map((endpoint) => (
        <div key={endpoint.path} className="grid gap-2 border-b border-white/10 bg-black/20 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[82px_1fr_1fr]">
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
          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          {active ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-[380px] overflow-auto p-4 text-xs leading-6 text-slate-100 md:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
