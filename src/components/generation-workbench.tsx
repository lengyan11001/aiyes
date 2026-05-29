"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Link2,
  Loader2,
  ChevronDown,
  Plus,
  RefreshCw,
  Send,
  Video,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import type { MenuUser } from "@/components/user-menu";
import { VIDEO_MODEL_OPTIONS } from "@/lib/pricing";
import { IMAGE_MODELS, MODEL_META, VIDEO_MODELS, type ModelMeta } from "@/lib/constants";
import { formatPoints } from "@/lib/units";

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELED";
type JobKind = "IMAGE" | "VIDEO";

export type WorkbenchJob = {
  id: string;
  kind: JobKind;
  model: string;
  status: JobStatus;
  prompt: string;
  result: unknown;
  error: string | null;
  chargedCents: number;
  upstreamTaskId: string | null;
  createdAt: string;
  completedAt: string | null;
};

type Filter = "ALL" | "COMPLETED" | "PROCESSING" | "FAILED";
type Mode = "IMAGE" | "VIDEO";

const statusText: Record<JobStatus, string> = {
  PENDING: "排队中",
  PROCESSING: "进行中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELED: "已取消",
};

const statusClass: Record<JobStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-slate-100 text-slate-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
  CANCELED: "bg-slate-100 text-slate-600",
};

function dateText(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findMediaUrl(value: unknown, kind: JobKind): string | null {
  const visited = new Set<unknown>();
  const imagePattern = /\.(png|jpe?g|webp|gif)(\?|#|$)/i;
  const videoPattern = /\.(mp4|webm|mov|m3u8)(\?|#|$)/i;
  const pattern = kind === "IMAGE" ? imagePattern : videoPattern;

  function visit(input: unknown): string | null {
    if (!input || visited.has(input)) return null;
    if (typeof input === "string") return /^https?:\/\//i.test(input) && pattern.test(input) ? input : null;
    if (Array.isArray(input)) {
      visited.add(input);
      for (const item of input) {
        const match = visit(item);
        if (match) return match;
      }
      return null;
    }
    if (typeof input === "object") {
      visited.add(input);
      const record = input as Record<string, unknown>;
      const preferred = [
        "url",
        "image_url",
        "video_url",
        "output_url",
        "file_url",
        "media_url",
        "download_url",
      ];
      for (const key of preferred) {
        const match = visit(record[key]);
        if (match) return match;
      }
      for (const item of Object.values(record)) {
        const match = visit(item);
        if (match) return match;
      }
    }
    return null;
  }

  return visit(value);
}

function firstValue(options?: readonly { value: string }[], fallback = "") {
  return options?.[0]?.value ?? fallback;
}

function jobDisplayModel(model: string) {
  const meta = MODEL_META[model as keyof typeof MODEL_META];
  return meta?.shortLabel ?? meta?.label ?? model;
}

function ensureOption(value: string, options?: readonly { value: string }[], fallback = "") {
  return options?.some((option) => option.value === value) ? value : firstValue(options, fallback);
}

function ModelPicker({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: string;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const models = (mode === "IMAGE" ? IMAGE_MODELS : VIDEO_MODELS) as readonly (ModelMeta & { default?: boolean })[];
  const current = models.find((model) => model.id === value) ?? models[0];

  return (
    <div className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className="inline-flex h-10 min-w-[220px] items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 text-left text-sm text-white outline-none transition hover:border-white/30 hover:bg-white/[0.08]"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{current?.label}</span>
          <span className="block truncate text-[11px] text-slate-400">{current?.pricingLabel}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-12 left-0 z-[90] max-h-[min(420px,calc(100vh-220px))] w-[520px] max-w-[calc(100vw-48px)] overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/60">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={`mb-1 flex w-full items-start justify-between gap-4 rounded-md px-3 py-2.5 text-left transition last:mb-0 ${
                model.id === value ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{model.label}</span>
                  {model.default && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${model.id === value ? "bg-slate-950/10 text-slate-700" : "bg-emerald-400/15 text-emerald-200"}`}>
                      默认
                    </span>
                  )}
                </span>
                <span className={`mt-0.5 block truncate text-xs ${model.id === value ? "text-slate-600" : "text-slate-400"}`}>
                  {model.summary}
                </span>
                <span className={`mt-1 block truncate text-[11px] ${model.id === value ? "text-slate-500" : "text-slate-500"}`}>
                  {model.pricingLabel}
                </span>
              </span>
              <span className={`shrink-0 rounded px-2 py-1 text-[11px] ${model.id === value ? "bg-slate-950/10 text-slate-700" : "bg-white/[0.06] text-slate-400"}`}>
                {mode === "IMAGE" ? "图片生成" : "视频生成"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options?: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className: string;
}) {
  if (!options?.length) return null;
  return (
    <select value={ensureOption(value, options)} onChange={(event) => onChange(event.target.value)} className={className}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function GenerationWorkbench({
  initialJobs,
  estimatedPrices,
  user,
}: {
  initialJobs: WorkbenchJob[];
  estimatedPrices: Record<Mode, number>;
  user: MenuUser;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState(initialJobs[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("VIDEO");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageUrl, setShowImageUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("4");
  const [imageSize, setImageSize] = useState("1K");
  const [imageQuality, setImageQuality] = useState("medium");
  const [imageModel, setImageModel] = useState("openai/gpt-image-2");
  const [videoBaseModel, setVideoBaseModel] = useState("seedance2");
  const [videoModel, setVideoModel] = useState("fast");
  const [videoResolution, setVideoResolution] = useState("720p");
  const [estimatedPrice, setEstimatedPrice] = useState(estimatedPrices.VIDEO);
  const [pricingDetail, setPricingDetail] = useState("按当前售卖价预估");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const visibleJobs = useMemo(() => {
    if (filter === "ALL") return jobs;
    if (filter === "PROCESSING") return jobs.filter((job) => job.status === "PENDING" || job.status === "PROCESSING");
    return jobs.filter((job) => job.status === filter);
  }, [filter, jobs]);

  const selected = jobs.find((job) => job.id === selectedId) || visibleJobs[0] || jobs[0];
  const selectedMedia = selected ? findMediaUrl(selected.result, selected.kind) : null;
  const currentModel = mode === "IMAGE" ? imageModel : videoBaseModel;
  const currentModelMeta = MODEL_META[currentModel as keyof typeof MODEL_META] as ModelMeta;
  const currentParams = currentModelMeta.parameters ?? {};
  const showVideoResolution = currentModel === "seedance2" ? videoModel === "standard_vip" : Boolean(currentParams.resolution?.length);
  const selectClass =
    "h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-white/40";

  function chooseImageModel(model: string) {
    const meta = MODEL_META[model as keyof typeof MODEL_META] as ModelMeta;
    if (!meta) return;
    setImageModel(model);
    setImageSize(firstValue(meta.parameters?.imageSize, "1K"));
    setImageQuality(firstValue(meta.parameters?.quality, "medium"));
    setAspectRatio(firstValue(meta.parameters?.aspectRatio, "1:1"));
  }

  function chooseVideoModel(model: string) {
    const meta = MODEL_META[model as keyof typeof MODEL_META] as ModelMeta;
    if (!meta) return;
    setVideoBaseModel(model);
    setDuration(firstValue(meta.parameters?.duration, model === "seedance2" ? "4" : "5"));
    setVideoResolution(firstValue(meta.parameters?.resolution, "720p"));
    setAspectRatio(firstValue(meta.parameters?.aspectRatio, "16:9"));
  }

  async function refreshJobs(nextSelectedId?: string) {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error?.message || "刷新失败");
    setJobs(payload.jobs || []);
    if (nextSelectedId) setSelectedId(nextSelectedId);
  }

  async function refreshSelectedJob(jobId: string) {
    setRefreshing(true);
    setMessage("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "刷新失败");
      const updated = payload.job as WorkbenchJob;
      setJobs((current) =>
        current.some((job) => job.id === updated.id)
          ? current.map((job) => (job.id === updated.id ? updated : job))
          : [updated, ...current],
      );
      setSelectedId(updated.id);
      if (payload.warning) setMessage(payload.warning);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function uploadReferenceImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingReference(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/reference-image", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "参考图上传失败");
      setImageUrl(payload.url);
      setShowImageUrl(true);
      setMessage("参考图已上传。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setUploadingReference(false);
      event.target.value = "";
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPricingLoading(true);
      try {
        const res = await fetch("/api/pricing/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentModel,
            duration: mode === "VIDEO" ? duration : undefined,
            quality: mode === "IMAGE" ? imageQuality : undefined,
            videoModel: mode === "VIDEO" ? videoModel : undefined,
            resolution: mode === "VIDEO" ? videoResolution : undefined,
            size: mode === "IMAGE" ? imageSize : undefined,
            aspectRatio,
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error?.message || "价格计算失败");
        if (!cancelled) {
          setEstimatedPrice(payload.estimate.points);
          setPricingDetail(payload.estimate.detail || "按当前售卖价预估");
        }
      } catch (error) {
        if (!cancelled) {
          setEstimatedPrice(estimatedPrices[mode]);
          setPricingDetail(error instanceof Error ? error.message : "价格计算失败");
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [aspectRatio, currentModel, duration, estimatedPrices, imageQuality, imageSize, mode, videoModel, videoResolution]);

  async function submit() {
    if (!prompt.trim()) {
      setMessage("先输入任务描述。");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const body =
        mode === "IMAGE"
          ? {
              kind: "IMAGE",
              model: currentModel,
              prompt,
              image_url: imageUrl || undefined,
              size: imageSize,
              quality: imageQuality,
              aspect_ratio: aspectRatio,
              async: true,
            }
          : {
              kind: "VIDEO",
              model: currentModel,
              prompt,
              image_url: imageUrl || undefined,
              aspect_ratio: aspectRatio,
              ratio: aspectRatio,
              duration,
              video_model: currentModel === "seedance2" ? videoModel : undefined,
              resolution: videoResolution,
              async: true,
            };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || payload?.error || "发送失败");
      setPrompt("");
      await refreshJobs(payload.job?.id);
      setMessage("任务已发送，结果会进入左侧列表。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={user} />

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="h-[320px] overflow-hidden border-b border-white/10 bg-white/[0.04] lg:h-[calc(100vh-64px)] lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center justify-between px-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">AIGC</p>
              <h1 className="mt-1 text-xl font-semibold">图片/视频生成</h1>
            </div>
          </div>
          <div className="grid grid-cols-4 border-b border-white/10 text-sm">
            {[
              ["ALL", "全部"],
              ["COMPLETED", "已完成"],
              ["PROCESSING", "进行中"],
              ["FAILED", "失败"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`h-10 border-b-2 ${filter === key ? "border-white text-white" : "border-transparent text-slate-400 hover:text-white"}`}
                type="button"
                onClick={() => setFilter(key as Filter)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-[calc(100%-104px)] overflow-y-auto p-3 lg:h-[calc(100vh-170px)]">
            {visibleJobs.length === 0 && (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">
                暂无任务，右侧输入后发送。
              </div>
            )}
            {visibleJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedId(job.id)}
                className={`mb-3 w-full rounded-lg border p-3 text-left transition ${
                  selected?.id === job.id ? "border-white bg-white/10" : "border-white/10 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[job.status]}`}>
                    {statusText[job.status]}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(job.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-200">{job.prompt}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  {job.kind === "IMAGE" ? <ImageIcon className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  <span>{jobDisplayModel(job.model)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-64px)] flex-col overflow-hidden lg:h-[calc(100vh-64px)]">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-5xl">
              {selected ? (
                <article className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      {selected.kind === "IMAGE" ? <ImageIcon className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                      {selected.kind === "IMAGE" ? "图片生成任务" : "视频生成任务"}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => refreshSelectedJob(selected.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-60"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        刷新
                      </button>
                      <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${statusClass[selected.status]}`}>
                        {statusText[selected.status]}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-semibold">提示词：</p>
                    <p className="mt-3 leading-8 text-slate-200">{selected.prompt}</p>
                    <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-black/20 px-4 py-3 text-sm text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        {selected.kind === "IMAGE" ? <ImageIcon className="h-4 w-4 text-slate-400" /> : <Video className="h-4 w-4 text-slate-400" />}
                        模型：{jobDisplayModel(selected.model)}
                      </span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4 text-slate-400" />创建：{dateText(selected.createdAt)}</span>
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-slate-400" />完成：{dateText(selected.completedAt)}</span>
                      <span>费用：{formatPoints(selected.chargedCents)}</span>
                    </div>
                    <div className="mt-6 min-h-[360px]">
                      {selected.status === "FAILED" && (
                        <div className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-200">
                          {selected.error || "任务失败。"}
                        </div>
                      )}
                      {selected.status !== "FAILED" && !selectedMedia && (
                        <button
                          type="button"
                          disabled={refreshing}
                          onClick={() => refreshSelectedJob(selected.id)}
                          className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/15 bg-black/20 text-sm text-slate-300 transition hover:border-white/30 hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-70"
                        >
                          <RefreshCw className={`h-6 w-6 ${refreshing ? "animate-spin" : ""}`} />
                          <span>
                            {selected.status === "COMPLETED"
                              ? "任务已完成，暂无可预览结果，点击刷新同步。"
                              : "任务处理中，点击这里刷新查看最新结果。"}
                          </span>
                        </button>
                      )}
                      {selectedMedia && selected.kind === "IMAGE" && (
                        <img src={selectedMedia} alt="" className="max-h-[560px] rounded-lg object-contain" />
                      )}
                      {selectedMedia && selected.kind === "VIDEO" && (
                        <video src={selectedMedia} controls className="max-h-[560px] rounded-lg bg-black" />
                      )}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                      <button
                        type="button"
                        disabled={refreshing}
                        onClick={() => refreshSelectedJob(selected.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        重新刷新
                      </button>
                      <span className="font-mono text-xs text-slate-500">任务ID：{selected.upstreamTaskId || selected.id}</span>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.04] text-slate-400">
                  发送第一条任务后会显示详情。
                </div>
              )}
            </div>
          </div>

          <div className="relative z-50 border-t border-white/10 bg-slate-950 px-6 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.35)]">
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-[56px_1fr] gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingReference}
                  className="flex h-16 items-center justify-center rounded-lg border border-dashed border-white/15 text-slate-400 hover:border-white/40 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  title="选择本地参考图"
                >
                  {uploadingReference ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6" />}
                </button>
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={uploadReferenceImage}
                />
                <textarea
                  className="h-20 resize-none rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/40"
                  placeholder={mode === "VIDEO" ? "描述你想要生成的视频内容..." : "描述你想要生成的图片内容..."}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMode(mode === "VIDEO" ? "IMAGE" : "VIDEO")}
                    className="inline-flex items-center gap-2 rounded-md border border-white bg-white px-3 py-2 text-sm font-medium text-slate-950"
                  >
                    {mode === "VIDEO" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                    {mode === "VIDEO" ? "视频生成" : "图片生成"}
                  </button>
                  <ModelPicker
                    mode={mode}
                    value={currentModel}
                    onChange={(model) => (mode === "IMAGE" ? chooseImageModel(model) : chooseVideoModel(model))}
                  />
                  {mode === "IMAGE" ? (
                    <>
                      <OptionSelect value={imageSize} options={currentParams.imageSize} onChange={setImageSize} className={selectClass} />
                      <OptionSelect value={imageQuality} options={currentParams.quality} onChange={setImageQuality} className={selectClass} />
                      <OptionSelect value={aspectRatio} options={currentParams.aspectRatio} onChange={setAspectRatio} className={selectClass} />
                    </>
                  ) : (
                    <>
                      <OptionSelect value={aspectRatio} options={currentParams.aspectRatio} onChange={setAspectRatio} className={selectClass} />
                      {currentModel === "seedance2" && (
                        <select value={videoModel} onChange={(event) => setVideoModel(event.target.value)} className={selectClass}>
                          {VIDEO_MODEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {showVideoResolution && (
                        <OptionSelect value={videoResolution} options={currentParams.resolution} onChange={setVideoResolution} className={selectClass} />
                      )}
                      <OptionSelect value={duration} options={currentParams.duration} onChange={setDuration} className={selectClass} />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowImageUrl((value) => !value)}
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                    title="粘贴参考图 URL"
                  >
                    <Link2 className="h-4 w-4" />
                    URL
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    预估消耗：
                    <b className="text-rose-300">{pricingLoading ? "计算中..." : formatPoints(estimatedPrice)}</b>
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={submit}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-slate-950 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    发送任务
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{pricingDetail}</p>
              {showImageUrl && (
                <input
                  className="mt-3 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/40"
                  type="url"
                  value={imageUrl}
                  placeholder="参考图 URL，可选"
                  onChange={(event) => setImageUrl(event.target.value)}
                />
              )}
              {imageUrl && (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <img src={imageUrl} alt="参考图" className="h-16 w-16 rounded-md border border-white/10 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">参考图已选择</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{imageUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:border-rose-300/40 hover:text-rose-200"
                    title="移除参考图"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
