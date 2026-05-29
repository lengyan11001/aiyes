import { MODEL_META, type AllowedModel, type ModelMeta } from "@/lib/constants";

export interface PriceEstimateInput {
  model: AllowedModel;
  duration?: string | number | null;
  quality?: string | null;
  videoModel?: string | null;
  resolution?: string | null;
  size?: string | null;
  aspectRatio?: string | null;
}

export interface PriceEstimate {
  points: number;
  source: "sale_pricing";
  detail: string;
}

const imagePriceTable: Record<string, Record<string, number>> = {
  "1K": { low: 4, medium: 16, high: 64 },
  "2K": { low: 4, medium: 24, high: 92 },
  "4K": { low: 8, medium: 44, high: 164 },
};

export const VIDEO_MODEL_OPTIONS = [
  {
    value: "fast",
    upstreamValue: "seedance2.0_fast_direct",
    label: "快速",
    pointsPerSecond: 85,
  },
  {
    value: "standard",
    upstreamValue: "seedance2.0_direct",
    label: "标准",
    pointsPerSecond: 100,
  },
  {
    value: "fast_vip",
    upstreamValue: "seedance2.0_fast_vision",
    label: "高阶快速",
    pointsPerSecond: 100,
  },
  {
    value: "standard_vip",
    upstreamValue: "seedance2.0_vision",
    label: "高阶标准",
    pointsPerSecond: 120,
  },
] as const;

export type VideoModelOption = (typeof VIDEO_MODEL_OPTIONS)[number]["value"];

function firstParameter(model: ModelMeta, key: keyof NonNullable<ModelMeta["parameters"]>) {
  return model.parameters?.[key]?.[0]?.value;
}

function normalizeFromOptions(value: string | number | null | undefined, options?: readonly { value: string }[]) {
  const text = value == null ? "" : String(value);
  if (options?.some((option) => option.value === text)) return text;
  return options?.[0]?.value;
}

function secondsFromDuration(value: string | number | null | undefined, fallback = 4) {
  const text = value == null ? "" : String(value);
  const matched = text.match(/\d+/);
  const seconds = Number(matched?.[0] ?? fallback);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
}

function imageSize(value?: string | null) {
  if (value === "2K" || value === "4K") return value;
  return "1K";
}

function imageQuality(value?: string | null) {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

export function normalizeVideoDuration(value: PriceEstimateInput["duration"], model: AllowedModel = "seedance2") {
  if (model === "seedance2") {
    const seconds = Number(value ?? 4);
    if (!Number.isFinite(seconds) || seconds <= 0) return 4;
    return Math.min(Math.max(Math.round(seconds), 4), 15);
  }
  const meta = MODEL_META[model];
  const normalized = normalizeFromOptions(value, meta.parameters?.duration);
  if (normalized) {
    if (meta.durationValueType === "number") return secondsFromDuration(normalized);
    if (meta.durationValueType === "string") return normalized;
    return normalized.endsWith("s") ? normalized : secondsFromDuration(normalized);
  }
  return firstParameter(meta, "duration") ?? "4";
}

export function normalizeVideoModel(value?: string | null): VideoModelOption {
  const direct = VIDEO_MODEL_OPTIONS.find((option) => option.value === value)?.value;
  if (direct) return direct;
  const upstream = VIDEO_MODEL_OPTIONS.find((option) => option.upstreamValue === value)?.value;
  if (upstream) return upstream;
  if (value === "标准") return "standard";
  if (value === "高清 720p") return "standard_vip";
  return "fast";
}

export function upstreamVideoModel(value?: string | null) {
  const normalized = normalizeVideoModel(value);
  return VIDEO_MODEL_OPTIONS.find((option) => option.value === normalized)?.upstreamValue ?? "seedance2.0_fast_direct";
}

export function normalizeVideoResolution(value?: string | null, model: AllowedModel = "seedance2") {
  if (model === "seedance2") return value === "1080p" ? "1080p" : "720p";
  const meta = MODEL_META[model];
  return normalizeFromOptions(value, meta.parameters?.resolution) ?? firstParameter(meta, "resolution") ?? "720p";
}

export function normalizeVideoRatio(value?: string | null, model: AllowedModel = "seedance2") {
  if (model === "seedance2") {
    if (["16:9", "21:9", "9:16", "4:3", "3:4", "1:1"].includes(value || "")) {
      return value as string;
    }
    return "1:1";
  }
  const meta = MODEL_META[model];
  return normalizeFromOptions(value, meta.parameters?.aspectRatio) ?? firstParameter(meta, "aspectRatio") ?? "16:9";
}

export function normalizeImageSize(value?: string | null, model: AllowedModel = "openai/gpt-image-2") {
  const meta = MODEL_META[model];
  if (model === "openai/gpt-image-2") return imageSize(value);
  return normalizeFromOptions(value, meta.parameters?.imageSize) ?? firstParameter(meta, "imageSize") ?? "1K";
}

export function normalizeImageAspectRatio(value?: string | null, model: AllowedModel = "openai/gpt-image-2") {
  const meta = MODEL_META[model];
  return normalizeFromOptions(value, meta.parameters?.aspectRatio) ?? firstParameter(meta, "aspectRatio") ?? "1:1";
}

function videoPointsPerSecond(videoModel: VideoModelOption, resolution: string) {
  if (videoModel === "standard_vip" && resolution === "1080p") return 200;
  return VIDEO_MODEL_OPTIONS.find((option) => option.value === videoModel)?.pointsPerSecond ?? 50;
}

function detail(prefix: string, model: ModelMeta, extra: string) {
  return `${prefix}：${model.label} / ${extra}`;
}

export function estimateGenerationPrice(input: PriceEstimateInput): PriceEstimate {
  const meta = MODEL_META[input.model];
  if (input.model === "openai/gpt-image-2") {
    const size = imageSize(input.size);
    const quality = imageQuality(input.quality);
    return {
      points: imagePriceTable[size][quality],
      source: "sale_pricing",
      detail: detail("售卖价", meta, `${size} / ${quality === "low" ? "低质量" : quality === "high" ? "高质量" : "中质量"}`),
    };
  }

  if (input.model === "seedance2") {
    const seconds = normalizeVideoDuration(input.duration, input.model) as number;
    const videoModel = normalizeVideoModel(input.videoModel ?? input.quality);
    const resolution = normalizeVideoResolution(input.resolution, input.model);
    const tier = VIDEO_MODEL_OPTIONS.find((option) => option.value === videoModel);
    const pointsPerSecond = videoPointsPerSecond(videoModel, resolution);
    const resolutionText = videoModel === "standard_vip" ? ` / ${resolution}` : "";
    return {
      points: Math.ceil(pointsPerSecond * seconds),
      source: "sale_pricing",
      detail: detail("售卖价", meta, `${tier?.label || "快速"}${resolutionText} / ${pointsPerSecond}积分/秒 x ${seconds}秒`),
    };
  }

  if (meta.kind === "IMAGE") {
    if (meta.pricing.type === "quantity") {
      const points = meta.pricing.quantityPrice ?? meta.pricing.base ?? 0;
      return {
        points,
        source: "sale_pricing",
        detail: detail("APIZ原价", meta, meta.pricingLabel),
      };
    }
    if (meta.pricing.type === "matrix") {
      const size = normalizeImageSize(input.size, input.model);
      const points = meta.pricing.matrix?.resolution?.[size] ?? meta.pricing.base ?? 0;
      return {
        points,
        source: "sale_pricing",
        detail: detail("APIZ原价", meta, `${size} / ${points}积分`),
      };
    }
  }

  if (meta.pricing.type === "fixed") {
    return {
      points: Math.ceil(meta.pricing.base ?? 0),
      source: "sale_pricing",
      detail: detail("APIZ原价", meta, meta.pricingLabel),
    };
  }

  const duration = normalizeVideoDuration(input.duration, input.model);
  const durationKey = String(duration);
  const seconds = secondsFromDuration(duration, secondsFromDuration(firstParameter(meta, "duration"), 4));
  const resolution = normalizeVideoResolution(input.resolution, input.model);

  if (meta.pricing.type === "duration_map") {
    const points = meta.pricing.durationPrices?.[durationKey] ?? meta.pricing.durationPrices?.[String(seconds)] ?? meta.pricing.base ?? 0;
    return {
      points: Math.ceil(points),
      source: "sale_pricing",
      detail: detail("APIZ原价", meta, `${durationKey.replace("s", "秒")} / ${points}积分`),
    };
  }

  if (meta.pricing.type === "matrix") {
    const points = meta.pricing.matrix?.[resolution]?.[durationKey] ?? meta.pricing.matrix?.[resolution]?.[String(seconds)] ?? meta.pricing.base ?? 0;
    return {
      points: Math.ceil(points),
      source: "sale_pricing",
      detail: detail("APIZ原价", meta, `${resolution} / ${durationKey.replace("s", "秒")} / ${points}积分`),
    };
  }

  if (meta.pricing.type === "per_second") {
    const rate = meta.pricing.resolutionRates?.[resolution] ?? meta.pricing.perSecond ?? 0;
    return {
      points: Math.ceil(rate * seconds),
      source: "sale_pricing",
      detail: detail("APIZ原价", meta, `${resolution ? `${resolution} / ` : ""}${rate}积分/秒 x ${seconds}秒`),
    };
  }

  return {
    points: Math.ceil(meta.pricing.base ?? 0),
    source: "sale_pricing",
    detail: detail("APIZ原价", meta, meta.pricingLabel),
  };
}
