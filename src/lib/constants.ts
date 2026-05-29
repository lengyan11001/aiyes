export type ModelKind = "VIDEO" | "IMAGE";

export type ModelParameter = {
  value: string;
  label: string;
};

export type ModelParameterSet = {
  duration?: ModelParameter[];
  resolution?: ModelParameter[];
  aspectRatio?: ModelParameter[];
  quality?: ModelParameter[];
  imageSize?: ModelParameter[];
};

export type ModelMeta = {
  id: string;
  upstreamId: string;
  label: string;
  shortLabel?: string;
  kind: ModelKind;
  taskType: "t2i" | "i2i" | "t2v" | "i2v" | "v2v";
  description: string;
  summary: string;
  pricingLabel: string;
  default?: boolean;
  requiresImage?: boolean;
  durationValueType?: "number" | "string";
  parameters?: ModelParameterSet;
  pricing: {
    type: "custom" | "fixed" | "per_second" | "duration_map" | "matrix" | "quantity";
    base?: number;
    perSecond?: number;
    resolutionRates?: Record<string, number>;
    durationPrices?: Record<string, number>;
    matrix?: Record<string, Record<string, number>>;
    quantityPrice?: number;
    detail?: string;
  };
  providerDefaults?: Record<string, unknown>;
};

export const MODEL_CATALOG = [
  {
    id: "seedance2",
    upstreamId: "st-ai/super-seed2-lite",
    label: "seedance2",
    kind: "VIDEO",
    taskType: "i2v",
    description: "适合 AI 助手接入视频生成、动态视觉和镜头化内容创作。",
    summary: "4-15 秒，支持文生视频和参考图生视频。",
    pricingLabel: "按档位与时长计费",
    default: true,
    parameters: {
      duration: ["4", "5", "8", "10", "15"].map((value) => ({ value, label: `${value}秒` })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ],
      aspectRatio: ["16:9", "21:9", "9:16", "1:1", "4:3", "3:4"].map((value) => ({ value, label: value })),
    },
    pricing: { type: "custom", detail: "seedance2 售卖价格" },
  },
  {
    id: "openai/gpt-image-2",
    upstreamId: "openai/gpt-image-2",
    label: "GPT Image 2",
    kind: "IMAGE",
    taskType: "t2i",
    description: "适合 AI 助手接入图片生成、场景图、插画和创意视觉生成。",
    summary: "最高 4K，适合文字渲染和高质量视觉。",
    pricingLabel: "按分辨率和质量计费",
    default: true,
    parameters: {
      imageSize: ["1K", "2K", "4K"].map((value) => ({ value, label: value })),
      quality: [
        { value: "low", label: "低质量" },
        { value: "medium", label: "中质量" },
        { value: "high", label: "高质量" },
      ],
      aspectRatio: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"].map((value) => ({ value, label: value })),
    },
    pricing: { type: "custom", detail: "GPT Image 2 售卖价格" },
  },
  {
    id: "alibaba/happy-horse/image-to-video",
    upstreamId: "alibaba/happy-horse/image-to-video",
    label: "Happy Horse 图生视频",
    shortLabel: "Happy Horse",
    kind: "VIDEO",
    taskType: "i2v",
    description: "阿里 Happy Horse 1.0 图生视频，支持原生音频和多语言口型同步。",
    summary: "720p/1080p，3-15 秒。",
    pricingLabel: "720p 56积分/秒，1080p 112积分/秒",
    durationValueType: "number",
    parameters: {
      duration: Array.from({ length: 13 }, (_, index) => String(index + 3)).map((value) => ({ value, label: `${value}秒` })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ],
      aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "per_second",
      resolutionRates: { "720p": 56, "1080p": 112 },
      detail: "APIZ 原价：720p 56积分/秒，1080p 112积分/秒",
    },
  },
  {
    id: "fal-ai/sora-2/image-to-video",
    upstreamId: "fal-ai/sora-2/image-to-video",
    label: "Sora 2 图生视频",
    shortLabel: "Sora 2",
    kind: "VIDEO",
    taskType: "i2v",
    description: "OpenAI Sora 2 图生视频，以图片为首帧生成 720p 带音频视频。",
    summary: "720p，4/8/12/16/20 秒。",
    pricingLabel: "40积分/秒",
    durationValueType: "number",
    parameters: {
      duration: ["4", "8", "12", "16", "20"].map((value) => ({ value, label: `${value}秒` })),
      resolution: [{ value: "720p", label: "720p" }],
      aspectRatio: ["auto", "16:9", "9:16"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "duration_map",
      durationPrices: { "4": 160, "8": 320, "12": 480, "16": 640, "20": 800 },
      detail: "APIZ 原价：按时长计费",
    },
    providerDefaults: { model: "sora-2" },
  },
  {
    id: "fal-ai/sora-2/image-to-video/pro",
    upstreamId: "fal-ai/sora-2/image-to-video/pro",
    label: "Sora 2 Pro 图生视频",
    shortLabel: "Sora 2 Pro",
    kind: "VIDEO",
    taskType: "i2v",
    description: "OpenAI Sora 2 Pro 图生视频，以图片为首帧生成高清视频。",
    summary: "720p/1080p，4/8/12/16/20 秒。",
    pricingLabel: "720p 120积分/秒，1080p 200积分/秒",
    durationValueType: "number",
    parameters: {
      duration: ["4", "8", "12", "16", "20"].map((value) => ({ value, label: `${value}秒` })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ],
      aspectRatio: ["auto", "16:9", "9:16"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "matrix",
      matrix: {
        "720p": { "4": 480, "8": 960, "12": 1440, "16": 1920, "20": 2400 },
        "1080p": { "4": 800, "8": 1600, "12": 2400, "16": 3200, "20": 4000 },
      },
      detail: "APIZ 原价：按分辨率和时长计费",
    },
  },
  {
    id: "fal-ai/veo3.1/lite/image-to-video",
    upstreamId: "fal-ai/veo3.1/lite/image-to-video",
    label: "Veo 3.1 Lite 图生视频",
    shortLabel: "Veo 3.1 Lite",
    kind: "VIDEO",
    taskType: "i2v",
    description: "Google Veo 3.1 Lite 图生视频，轻量经济。",
    summary: "720p/1080p，4/6/8 秒。",
    pricingLabel: "720p 20积分/秒，1080p 32积分/秒",
    parameters: {
      duration: ["4s", "6s", "8s"].map((value) => ({ value, label: value })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
      ],
      aspectRatio: ["auto", "16:9", "9:16"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "per_second",
      resolutionRates: { "720p": 20, "1080p": 32 },
      detail: "APIZ 原价：按秒计费",
    },
  },
  {
    id: "fal-ai/veo3.1/fast/image-to-video",
    upstreamId: "fal-ai/veo3.1/fast/image-to-video",
    label: "Veo 3.1 Fast 图生视频",
    shortLabel: "Veo 3.1 Fast",
    kind: "VIDEO",
    taskType: "i2v",
    description: "Google Veo 3.1 Fast 图生视频，更快更经济，默认生成音频。",
    summary: "720p/1080p/4K，4/6/8 秒。",
    pricingLabel: "720p/1080p 60积分/秒，4K 140积分/秒",
    parameters: {
      duration: ["4s", "6s", "8s"].map((value) => ({ value, label: value })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
        { value: "4k", label: "4K" },
      ],
      aspectRatio: ["auto", "16:9", "9:16"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "per_second",
      resolutionRates: { "720p": 60, "1080p": 60, "4k": 140 },
      detail: "APIZ 原价：默认有音频按秒计费",
    },
    providerDefaults: { generate_audio: true },
  },
  {
    id: "fal-ai/veo3.1/image-to-video",
    upstreamId: "fal-ai/veo3.1/image-to-video",
    label: "Veo 3.1 图生视频",
    shortLabel: "Veo 3.1",
    kind: "VIDEO",
    taskType: "i2v",
    description: "Google Veo 3.1 标准版图生视频，支持更高质量视频和音频。",
    summary: "720p/1080p/4K，4/6/8 秒。",
    pricingLabel: "720p/1080p 160积分/秒，4K 240积分/秒",
    parameters: {
      duration: ["4s", "6s", "8s"].map((value) => ({ value, label: value })),
      resolution: [
        { value: "720p", label: "720p" },
        { value: "1080p", label: "1080p" },
        { value: "4k", label: "4K" },
      ],
      aspectRatio: ["auto", "16:9", "9:16"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "per_second",
      resolutionRates: { "720p": 160, "1080p": 160, "4k": 240 },
      detail: "APIZ 原价：默认有音频按秒计费",
    },
    providerDefaults: { generate_audio: true },
  },
  {
    id: "fal-ai/kling-video/o3/standard/text-to-video",
    upstreamId: "fal-ai/kling-video/o3/standard/text-to-video",
    label: "Kling O3 文生视频",
    shortLabel: "Kling O3",
    kind: "VIDEO",
    taskType: "t2v",
    description: "Kling O3 Standard 文生视频，支持原生音频和多镜头提示词。",
    summary: "3-15 秒。",
    pricingLabel: "67.2积分/秒",
    durationValueType: "string",
    parameters: {
      duration: Array.from({ length: 13 }, (_, index) => String(index + 3)).map((value) => ({ value, label: `${value}秒` })),
      aspectRatio: ["16:9", "9:16", "1:1"].map((value) => ({ value, label: value })),
    },
    pricing: { type: "per_second", perSecond: 67.2, detail: "APIZ 原价：无音频 67.2积分/秒" },
    providerDefaults: { generate_audio: false },
  },
  {
    id: "fal-ai/kling-video/o3/pro/text-to-video",
    upstreamId: "fal-ai/kling-video/o3/pro/text-to-video",
    label: "Kling O3 Pro 文生视频",
    shortLabel: "Kling O3 Pro",
    kind: "VIDEO",
    taskType: "t2v",
    description: "Kling O3 Pro 文生视频，更高画质版本。",
    summary: "3-15 秒。",
    pricingLabel: "89.6积分/秒",
    durationValueType: "string",
    parameters: {
      duration: Array.from({ length: 13 }, (_, index) => String(index + 3)).map((value) => ({ value, label: `${value}秒` })),
      aspectRatio: ["16:9", "9:16", "1:1"].map((value) => ({ value, label: value })),
    },
    pricing: { type: "per_second", perSecond: 89.6, detail: "APIZ 原价：无音频 89.6积分/秒" },
    providerDefaults: { generate_audio: false },
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    upstreamId: "fal-ai/minimax/hailuo-2.3/standard/image-to-video",
    label: "Hailuo 2.3 图生视频",
    shortLabel: "Hailuo 2.3",
    kind: "VIDEO",
    taskType: "i2v",
    description: "MiniMax Hailuo 2.3 Standard 图生视频，768p。",
    summary: "6/10 秒。",
    pricingLabel: "6秒 112积分，10秒 224积分",
    durationValueType: "string",
    parameters: {
      duration: ["6", "10"].map((value) => ({ value, label: `${value}秒` })),
    },
    pricing: { type: "duration_map", durationPrices: { "6": 112, "10": 224 }, detail: "APIZ 原价：按时长计费" },
  },
  {
    id: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
    upstreamId: "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
    label: "Hailuo 2.3 Pro 图生视频",
    shortLabel: "Hailuo 2.3 Pro",
    kind: "VIDEO",
    taskType: "i2v",
    description: "MiniMax Hailuo 2.3 Pro 图生视频，1080p。",
    summary: "固定价格。",
    pricingLabel: "196积分/次",
    parameters: {},
    pricing: { type: "fixed", base: 196, detail: "APIZ 原价：固定价格" },
  },
  {
    id: "fal-ai/vidu/q3/image-to-video",
    upstreamId: "fal-ai/vidu/q3/image-to-video",
    label: "Vidu Q3 图生视频",
    shortLabel: "Vidu Q3",
    kind: "VIDEO",
    taskType: "i2v",
    description: "Vidu Q3 Pro 图生视频，支持 1-16 秒和多分辨率。",
    summary: "360p/540p/720p/1080p，1-16 秒。",
    pricingLabel: "360p/540p 28积分/秒，720p/1080p 62积分/秒",
    durationValueType: "number",
    parameters: {
      duration: Array.from({ length: 16 }, (_, index) => String(index + 1)).map((value) => ({ value, label: `${value}秒` })),
      resolution: ["360p", "540p", "720p", "1080p"].map((value) => ({ value, label: value })),
      aspectRatio: ["16:9", "9:16", "4:3", "3:4", "1:1"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "per_second",
      resolutionRates: { "360p": 28, "540p": 28, "720p": 62, "1080p": 62 },
      detail: "APIZ 原价：按分辨率和时长计费",
    },
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    upstreamId: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    label: "Seedream 4.5 文生图",
    shortLabel: "Seedream 4.5",
    kind: "IMAGE",
    taskType: "t2i",
    description: "字节跳动 Seedream 4.5 文生图，支持高质量 2K/4K 图像生成。",
    summary: "高质量文生图，支持多尺寸预设。",
    pricingLabel: "16积分/张",
    parameters: {
      imageSize: [
        { value: "auto_2K", label: "Auto 2K" },
        { value: "auto_4K", label: "Auto 4K" },
        { value: "square_hd", label: "方图高清" },
        { value: "portrait_16_9", label: "竖版 16:9" },
        { value: "landscape_16_9", label: "横版 16:9" },
      ],
    },
    pricing: { type: "quantity", quantityPrice: 16, detail: "APIZ 原价：16积分/张" },
  },
  {
    id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    upstreamId: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    label: "Seedream 5.0 Lite 文生图",
    shortLabel: "Seedream 5 Lite",
    kind: "IMAGE",
    taskType: "t2i",
    description: "字节跳动 Seedream 5.0 Lite，快速高质量智能文生图。",
    summary: "快速文生图，支持提示词增强。",
    pricingLabel: "14积分/张",
    parameters: {
      imageSize: [
        { value: "auto_2K", label: "Auto 2K" },
        { value: "auto_3K", label: "Auto 3K" },
        { value: "square_hd", label: "方图高清" },
        { value: "portrait_16_9", label: "竖版 16:9" },
        { value: "landscape_16_9", label: "横版 16:9" },
      ],
    },
    pricing: { type: "quantity", quantityPrice: 14, detail: "APIZ 原价：14积分/张" },
  },
  {
    id: "fal-ai/nano-banana-2",
    upstreamId: "fal-ai/nano-banana-2",
    label: "Nano Banana 2",
    kind: "IMAGE",
    taskType: "t2i",
    description: "Google Gemini 3.1 Flash Image 架构，高质量图像生成和编辑。",
    summary: "支持文生图和参考图编辑。",
    pricingLabel: "0.5K 24，1K 32，2K 48，4K 64积分/张",
    parameters: {
      imageSize: ["0.5K", "1K", "2K", "4K"].map((value) => ({ value, label: value })),
      aspectRatio: ["auto", "16:9", "9:16", "1:1", "4:3", "3:4"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "matrix",
      matrix: {
        resolution: { "0.5K": 24, "1K": 32, "2K": 48, "4K": 64 },
      },
      detail: "APIZ 原价：按分辨率计费",
    },
  },
  {
    id: "fal-ai/nano-banana-pro",
    upstreamId: "fal-ai/nano-banana-pro",
    label: "Nano Banana Pro",
    kind: "IMAGE",
    taskType: "t2i",
    description: "Google 高质量图像生成和编辑模型，支持写实风格和文字渲染。",
    summary: "更高质量，支持参考图编辑。",
    pricingLabel: "1K 60，2K 90，4K 120积分/张",
    parameters: {
      imageSize: ["1K", "2K", "4K"].map((value) => ({ value, label: value })),
      aspectRatio: ["16:9", "9:16", "1:1", "4:3", "3:4"].map((value) => ({ value, label: value })),
    },
    pricing: {
      type: "matrix",
      matrix: {
        resolution: { "1K": 60, "2K": 90, "4K": 120 },
      },
      detail: "APIZ 原价：按分辨率计费",
    },
  },
] as const satisfies readonly ModelMeta[];

export const ALLOWED_MODELS = MODEL_CATALOG.map((model) => model.id);

export type AllowedModel = (typeof MODEL_CATALOG)[number]["id"];

export const MODEL_META = Object.fromEntries(MODEL_CATALOG.map((model) => [model.id, model])) as Record<
  AllowedModel,
  ModelMeta
> &
  Record<string, ModelMeta | undefined>;

export const UPSTREAM_MODEL_IDS = Object.fromEntries(
  MODEL_CATALOG.map((model) => [model.id, model.upstreamId]),
) as Record<AllowedModel, string>;

export const IMAGE_MODELS = MODEL_CATALOG.filter((model) => model.kind === "IMAGE");
export const VIDEO_MODELS = MODEL_CATALOG.filter((model) => model.kind === "VIDEO");

export function isAllowedModel(model: string): model is AllowedModel {
  return Object.prototype.hasOwnProperty.call(MODEL_META, model);
}

export function modelKind(model: AllowedModel) {
  return (MODEL_META[model] as ModelMeta).kind;
}

export function upstreamModelId(model: AllowedModel) {
  return UPSTREAM_MODEL_IDS[model];
}
