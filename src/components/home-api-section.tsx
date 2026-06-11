"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Code2, Copy, Image as ImageIcon, KeyRound, ListChecks, Terminal, Video } from "lucide-react";

type TabKey = "guide" | "examples" | "models" | "mcp";

const tokenPlaceholder = "ak_xxx";

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "guide", label: "完整文档", icon: ListChecks },
  { key: "examples", label: "调用示例", icon: Code2 },
  { key: "models", label: "模型参数", icon: Video },
  { key: "mcp", label: "MCP 接入", icon: Terminal },
];

const endpoints = [
  { method: "GET", path: "/api/v1/models", text: "查询模型、参数取值、默认价格" },
  { method: "GET/POST", path: "/api/v1/pricing/estimate", text: "按实际参数预估积分" },
  { method: "POST", path: "/api/v1/images/generations", text: "图片生成" },
  { method: "POST", path: "/api/v1/videos/generations", text: "视频生成" },
  { method: "GET", path: "/api/v1/jobs/{id}", text: "查询任务状态和结果" },
];

const seedanceVideoModels = [
  { value: "fast", label: "快速", price: "85 积分/秒", note: "默认档位" },
  { value: "standard", label: "标准", price: "100 积分/秒", note: "不是传中文“标准”" },
  { value: "fast_vip", label: "高阶快速", price: "100 积分/秒", note: "必须带下划线" },
  { value: "standard_vip", label: "高阶标准", price: "120 积分/秒；1080p 为 200 积分/秒", note: "必须带下划线" },
];

const modelRows = [
  {
    id: "seedance2",
    kind: "视频 i2v/t2v",
    required: "model, prompt",
    params: "duration: 4/5/8/10/15；aspect_ratio: 16:9/21:9/9:16/1:1/4:3/3:4；video_model: fast/standard/fast_vip/standard_vip；resolution: 720p/1080p",
    price: "按 video_model、resolution、duration 计费",
  },
  {
    id: "openai/gpt-image-2",
    kind: "图片 t2i/i2i",
    required: "model, prompt",
    params: "size: 1K/2K/4K；quality: low/medium/high；aspect_ratio: 1:1/4:3/3:4/16:9/9:16/3:2/2:3；image_url 可传参考图",
    price: "1K low 4、medium 16、high 64；2K low 4、medium 24、high 92；4K low 8、medium 44、high 164",
  },
  {
    id: "alibaba/happy-horse/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 3-15；resolution: 720p/1080p；aspect_ratio: 16:9/9:16/1:1/4:3/3:4",
    price: "720p 56 积分/秒；1080p 112 积分/秒",
  },
  {
    id: "fal-ai/sora-2/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 4/8/12/16/20；resolution: 720p；aspect_ratio: auto/16:9/9:16",
    price: "40 积分/秒",
  },
  {
    id: "fal-ai/sora-2/image-to-video/pro",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 4/8/12/16/20；resolution: 720p/1080p；aspect_ratio: auto/16:9/9:16",
    price: "720p 120 积分/秒；1080p 200 积分/秒",
  },
  {
    id: "fal-ai/veo3.1/lite/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p；aspect_ratio: auto/16:9/9:16",
    price: "720p 20 积分/秒；1080p 32 积分/秒",
  },
  {
    id: "fal-ai/veo3.1/fast/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p/4k；aspect_ratio: auto/16:9/9:16",
    price: "720p/1080p 60 积分/秒；4k 140 积分/秒",
  },
  {
    id: "fal-ai/veo3.1/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 4s/6s/8s；resolution: 720p/1080p/4k；aspect_ratio: auto/16:9/9:16",
    price: "720p/1080p 160 积分/秒；4k 240 积分/秒",
  },
  {
    id: "fal-ai/kling-video/o3/standard/text-to-video",
    kind: "视频 t2v",
    required: "model, prompt",
    params: "duration: 3-15；aspect_ratio: 16:9/9:16/1:1",
    price: "67.2 积分/秒",
  },
  {
    id: "fal-ai/kling-video/o3/pro/text-to-video",
    kind: "视频 t2v",
    required: "model, prompt",
    params: "duration: 3-15；aspect_ratio: 16:9/9:16/1:1",
    price: "89.6 积分/秒",
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 6/10",
    price: "6 秒 112 积分；10 秒 224 积分",
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "固定档位，无额外必传参数",
    price: "196 积分/次",
  },
  {
    id: "fal-ai/vidu/q3/image-to-video",
    kind: "视频 i2v",
    required: "model, prompt, image_url",
    params: "duration: 1-16；resolution: 360p/540p/720p/1080p；aspect_ratio: 16:9/9:16/4:3/3:4/1:1",
    price: "360p/540p 28 积分/秒；720p/1080p 62 积分/秒",
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    kind: "图片 t2i",
    required: "model, prompt",
    params: "size: auto_2K/auto_4K/square_hd/portrait_16_9/landscape_16_9",
    price: "16 积分/张",
  },
  {
    id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    kind: "图片 t2i",
    required: "model, prompt",
    params: "size: auto_2K/auto_3K/square_hd/portrait_16_9/landscape_16_9",
    price: "14 积分/张",
  },
  {
    id: "fal-ai/nano-banana-2",
    kind: "图片 t2i/i2i",
    required: "model, prompt",
    params: "size: 0.5K/1K/2K/4K；aspect_ratio: auto/16:9/9:16/1:1/4:3/3:4；image_url 可传参考图",
    price: "0.5K 24；1K 32；2K 48；4K 64 积分/张",
  },
  {
    id: "fal-ai/nano-banana-pro",
    kind: "图片 t2i/i2i",
    required: "model, prompt",
    params: "size: 1K/2K/4K；aspect_ratio: 16:9/9:16/1:1/4:3/3:4；image_url 可传参考图",
    price: "1K 60；2K 90；4K 120 积分/张",
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

function imageWithReferenceCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/images/generations \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "fal-ai/nano-banana-2",
    "prompt": "参考图人物保持一致，改成电影海报风格",
    "image_url": "https://example.com/reference.png",
    "size": "1K",
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

function otherVideoCurl(token: string) {
  return `curl https://aiyes.vip/api/v1/videos/generations \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "fal-ai/veo3.1/fast/image-to-video",
    "prompt": "让参考图中的产品在柔和灯光下缓慢旋转，镜头平滑推进",
    "image_url": "https://example.com/product.png",
    "duration": "8s",
    "resolution": "1080p",
    "aspect_ratio": "16:9",
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

function fullGuide(token: string) {
  return `# Aiyes 对外 API 接入文档

Base URL: https://aiyes.vip
认证方式: HTTP Header 添加 Authorization: Bearer ${token}
Content-Type: 生成类接口使用 application/json

## 1. 先拿模型和参数

GET /api/v1/models

用途: 查询当前可用模型、模型类型、任务类型、参数取值和默认价格。

示例:
${modelListCurl(token)}

返回里每个模型的 meta.parameters 就是可传参数取值。前端文档下方也列出了当前完整取值表。

## 2. 查询价格

GET 或 POST /api/v1/pricing/estimate

常用 query 参数:
- model: 必填，模型 ID，例如 seedance2
- duration: 视频时长，按模型取值传，例如 seedance2 传 4/5/8/10/15
- video_model: 仅 seedance2 使用，可选值只有 fast、standard、fast_vip、standard_vip
- resolution: 分辨率，例如 720p、1080p、4k
- size 或 image_size: 图片尺寸，例如 1K、2K、4K
- quality: 图片质量，例如 low、medium、high
- aspect_ratio 或 ratio: 画幅，例如 16:9、9:16、1:1

示例:
${priceCurl(token)}

## 3. 图片生成

POST /api/v1/images/generations

通用参数:
- model: 必填，图片模型 ID
- prompt: 必填，1 到 5000 字符
- size: 可选，图片尺寸。不同模型取值不同
- quality: 可选，openai/gpt-image-2 支持 low、medium、high
- aspect_ratio: 可选，画幅比例。部分模型支持
- image_url: 可选，参考图片 URL。需要公网可访问
- async: 可选，建议 true。true 时立即返回任务 ID，再用任务查询接口轮询
- options: 可选 object，高级透传参数

输入素材说明:
- image_url: 当前公开接口的参考素材字段。图片生成可用它做参考图；视频生成可用它做首帧/参考图。
- audio_url: 当前公开生成接口没有独立音频输入字段，不要传。
- video_url: 当前公开生成接口没有独立视频输入字段，不要传。视频结果在任务完成后的 result 中读取。

示例:
${imageCurl(token)}

参考图示例:
${imageWithReferenceCurl(token)}

## 4. 视频生成

POST /api/v1/videos/generations

通用参数:
- model: 必填，视频模型 ID
- prompt: 必填，1 到 5000 字符
- image_url: 图生视频传参考图/首帧图片 URL。需要公网可访问。文生视频模型可以不传
- duration: 可选，视频时长。不同模型取值不同
- aspect_ratio: 可选，画幅比例。也兼容 ratio
- resolution: 可选，分辨率。不同模型取值不同
- video_model: 仅 seedance2 使用，可选值只有 fast、standard、fast_vip、standard_vip
- async: 可选，建议 true
- options: 可选 object，高级透传参数

输入素材说明:
- image_url: 图生视频/首帧图传这个字段，必须是公网可访问 URL。
- audio_url: 当前公开生成接口没有独立音频输入字段，不要传。
- video_url: 当前公开生成接口没有独立视频输入字段，不要传。视频生成结果在任务完成后的 result 中读取。

seedance2 的 video_model 固定取值:
- fast: 快速，默认档位
- standard: 标准。参数值传英文 standard，不传中文“标准”
- fast_vip: 高阶快速。必须是 fast_vip，有下划线
- standard_vip: 高阶标准。必须是 standard_vip，有下划线

seedance2 示例:
${videoCurl(token)}

Veo 3.1 Fast 图生视频示例:
${otherVideoCurl(token)}

## 5. 查询任务结果

GET /api/v1/jobs/{id}

生成接口返回 id 后，用这个接口轮询。任务状态常见值:
- PENDING: 等待中
- PROCESSING: 处理中
- COMPLETED: 已完成，result 中有结果
- FAILED: 失败，error 中有错误原因

示例:
${jobCurl(token)}

## 6. 当前模型参数取值

${modelRows
  .map((row) => `### ${row.id}
- 类型: ${row.kind}
- 必传: ${row.required}
- 参数: ${row.params}
- 价格: ${row.price}`)
  .join("\n\n")}

## 7. 错误码

- 401 missing_api_key: 没有传 Authorization Bearer token
- 401 invalid_api_key: token 无效、已删除或用户被禁用
- 400 model_not_allowed: 模型不存在或该 API Key 未开通
- 402 insufficient_balance / api_key_limit_exhausted: 余额不足或 API Key 额度/次数不足
- 422 validation_error: 请求体格式或参数不正确
- 429 rate_limited: 请求过快，按 Retry-After 后重试
- 502 upstream_error: 上游模型调用失败，平台会按任务失败逻辑处理退款
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
  const apiToken = initialApiToken;
  const displayToken = apiToken || tokenPlaceholder;
  const guide = useMemo(() => fullGuide(displayToken), [displayToken]);

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
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_1fr]">
        <aside>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-950">
            <Code2 className="h-6 w-6" />
          </div>
          <p className="mt-6 text-sm font-medium text-cyan-200">API 接入文档</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight">复制后即可调通的模型接口说明</h2>
          <p className="mt-5 leading-7 text-slate-300">
            所有生成接口都使用 Aiyes API Key。页面会自动放入当前登录用户的稳定 token；模型、参数、价格和任务轮询都集中在这里。
          </p>
          <div className="mt-7 grid gap-3 text-sm text-slate-300">
            <Fact icon={Video} label="seedance2 video_model" value="fast / standard / fast_vip / standard_vip" />
            <Fact icon={ImageIcon} label="图片参考图" value="image_url 传公网可访问图片 URL" />
            <Fact icon={Terminal} label="音频/视频输入" value="当前公开接口不单独接 audio_url 或 video_url" />
          </div>
        </aside>

        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <TokenPanel
            token={apiToken}
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
            {active === "examples" && <ExamplesPanel token={displayToken} copied={copied} onCopy={copy} />}
            {active === "models" && <ModelsPanel />}
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
            请求头固定传 <span className="font-mono text-white">Authorization: Bearer YOUR_TOKEN</span>。
            新用户注册后会自动生成一个稳定 token。
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
            title={token ? "复制稳定 Token" : "请先登录"}
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
      <PanelHeader
        title="完整接入文档"
        text="给客户时直接复制这一份。里面包含认证、模型查询、价格预估、图片生成、视频生成、任务查询和全部参数取值。"
      />
      <button
        type="button"
        onClick={() => onCopy("full-guide", guide)}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-950 hover:bg-cyan-100"
      >
        {copied === "full-guide" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copied === "full-guide" ? "完整文档已复制" : "一键复制完整文档"}
      </button>
      <CodeBlock id="guide-preview" title="文档预览" code={guide} copied={copied} onCopy={onCopy} />
    </div>
  );
}

function ExamplesPanel({ token, copied, onCopy }: CopyProps & { token: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader
        title="常用调用示例"
        text="先查模型和价格，再发起生成。建议生成接口传 async: true，然后用任务查询接口轮询结果。"
      />
      <EndpointList />
      <SeedanceNotice />
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeBlock id="models" title="查询可用模型和参数" code={modelListCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="price" title="查询价格预估" code={priceCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="image" title="图片生成" code={imageCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="image-ref" title="参考图生成图片" code={imageWithReferenceCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="video" title="seedance2 视频生成" code={videoCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="video-other" title="Veo 图生视频" code={otherVideoCurl(token)} copied={copied} onCopy={onCopy} />
        <CodeBlock id="job" title="查询任务结果" code={jobCurl(token)} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

function ModelsPanel() {
  return (
    <div className="grid gap-5">
      <PanelHeader
        title="模型参数取值"
        text="以下是当前固定可用值。程序接入时建议先调用 /api/v1/models 动态读取，文档表用于人工核对。"
      />
      <SeedanceNotice />
      <div className="overflow-hidden rounded-lg border border-white/10">
        {modelRows.map((row) => (
          <div key={row.id} className="grid gap-3 border-b border-white/10 bg-black/20 p-4 text-sm last:border-b-0">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <code className="break-all font-mono text-cyan-100">{row.id}</code>
              <span className="w-fit rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">{row.kind}</span>
            </div>
            <p className="text-slate-300"><span className="text-slate-500">必传：</span>{row.required}</p>
            <p className="leading-6 text-slate-300"><span className="text-slate-500">参数：</span>{row.params}</p>
            <p className="leading-6 text-slate-300"><span className="text-slate-500">价格：</span>{row.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function McpPanel({ token, copied, onCopy }: CopyProps & { token: string }) {
  return (
    <div className="grid gap-5">
      <PanelHeader
        title="MCP 怎么接"
        text="MCP 入口为 Streamable HTTP JSON-RPC，使用同一个平台 API Key 授权。"
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
      <CodeBlock id="mcp-list" title="列出 MCP 工具" code={mcpListCurl(token)} copied={copied} onCopy={onCopy} />
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

function SeedanceNotice() {
  return (
    <div className="rounded-lg border border-cyan-200/20 bg-cyan-200/10 p-4">
      <p className="font-medium text-cyan-100">seedance2 的 video_model 固定传英文值</p>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        {seedanceVideoModels.map((item) => (
          <div key={item.value} className="rounded-md border border-white/10 bg-slate-950/70 p-3">
            <code className="font-mono text-white">{item.value}</code>
            <p className="mt-1 text-slate-300">{item.label}，{item.price}</p>
            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
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
          className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          {active ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-slate-100 md:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
