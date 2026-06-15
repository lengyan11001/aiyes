import { MODEL_META, type AllowedModel } from "@/lib/constants";
import {
  normalizeImageAspectRatio,
  normalizeImageSize,
  normalizeVideoDuration,
  normalizeVideoRatio,
  normalizeVideoResolution,
  upstreamVideoModel,
} from "@/lib/pricing";

export type GenerationProviderInput = {
  model: AllowedModel;
  prompt: string;
  image_url?: string;
  end_image_url?: string;
  image_files?: string[];
  video_url?: string;
  video_files?: string[];
  audio_files?: string[];
  aspect_ratio?: string;
  ratio?: string;
  duration?: string | number;
  size?: string;
  quality?: string;
  video_model?: string;
  resolution?: string;
  functionMode?: string;
  seed?: string | number;
  options?: Record<string, unknown>;
};

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstStringArray(...values: unknown[]) {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const items = value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
    if (items.length) return items;
  }
  return undefined;
}

function integerSeed(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const seed = Number(value);
  return Number.isInteger(seed) ? seed : undefined;
}

export function buildProviderParams(input: GenerationProviderInput) {
  const meta = MODEL_META[input.model];
  const options = input.options ?? {};

  if (input.model === "seedance2") {
    const functionMode = firstString(input.functionMode, options.functionMode);
    const firstLastFrame = functionMode === "first_last_frame";
    const imageFiles = firstLastFrame
      ? undefined
      : firstStringArray(input.image_files, options.image_files) ??
        (input.image_url ? [input.image_url] : firstStringArray(options.image_files));
    const videoFiles =
      firstStringArray(input.video_files, options.video_files) ??
      (input.video_url ? [input.video_url] : undefined);
    return {
      ...options,
      prompt: input.prompt,
      model: upstreamVideoModel(input.video_model ?? input.quality, input.resolution),
      duration: normalizeVideoDuration(input.duration, input.model),
      ratio: normalizeVideoRatio(input.ratio ?? input.aspect_ratio, input.model),
      resolution: normalizeVideoResolution(input.resolution, input.model, input.video_model ?? input.quality),
      functionMode,
      image_url: firstString(input.image_url, options.image_url),
      end_image_url: firstString(input.end_image_url, options.end_image_url),
      image_files: imageFiles,
      video_url: firstString(input.video_url, options.video_url),
      video_files: videoFiles,
      audio_files: firstStringArray(input.audio_files, options.audio_files),
      seed: integerSeed(input.seed ?? options.seed),
    };
  }

  if (meta.kind === "VIDEO") {
    const normalizedDuration = normalizeVideoDuration(input.duration, input.model);
    const imageFiles =
      firstStringArray(input.image_files, options.image_files) ??
      (input.image_url ? [input.image_url] : firstStringArray(options.image_files));
    return {
      ...meta.providerDefaults,
      ...options,
      prompt: input.prompt,
      duration: normalizedDuration,
      aspect_ratio: normalizeVideoRatio(input.ratio ?? input.aspect_ratio, input.model),
      resolution: meta.parameters?.resolution ? normalizeVideoResolution(input.resolution, input.model) : options.resolution,
      image_url: firstString(input.image_url, options.image_url),
      image_urls: imageFiles ?? options.image_urls,
      image_files: imageFiles,
      video_url: firstString(input.video_url, options.video_url),
      video_files: firstStringArray(input.video_files, options.video_files),
      audio_files: firstStringArray(input.audio_files, options.audio_files),
      seed: integerSeed(input.seed ?? options.seed),
    };
  }

  if (input.model === "openai/gpt-image-2") {
    return {
      ...options,
      prompt: input.prompt,
      image_url: input.image_url,
      image_size: input.aspect_ratio ?? input.ratio ?? options.image_size,
      resolution: normalizeImageSize(input.size, input.model),
      quality: input.quality,
    };
  }

  return {
    ...meta.providerDefaults,
    ...options,
    prompt: input.prompt,
    image_size: normalizeImageSize(input.size, input.model),
    resolution: normalizeImageSize(input.size, input.model),
    aspect_ratio: normalizeImageAspectRatio(input.aspect_ratio ?? input.ratio, input.model),
    num_images: 1,
    image_url: input.image_url ?? options.image_url,
    image_urls: input.image_url ? [input.image_url] : options.image_urls,
  };
}
