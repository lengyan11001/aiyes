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
  aspect_ratio?: string;
  ratio?: string;
  duration?: string | number;
  size?: string;
  quality?: string;
  video_model?: string;
  resolution?: string;
  options?: Record<string, unknown>;
};

export function buildProviderParams(input: GenerationProviderInput) {
  const meta = MODEL_META[input.model];
  const options = input.options ?? {};

  if (input.model === "seedance2") {
    return {
      ...options,
      prompt: input.prompt,
      model: upstreamVideoModel(input.video_model ?? input.quality),
      duration: normalizeVideoDuration(input.duration, input.model),
      ratio: normalizeVideoRatio(input.ratio ?? input.aspect_ratio, input.model),
      resolution: normalizeVideoResolution(input.resolution, input.model),
      image_files: input.image_url ? [input.image_url] : options.image_files,
    };
  }

  if (meta.kind === "VIDEO") {
    const normalizedDuration = normalizeVideoDuration(input.duration, input.model);
    return {
      ...meta.providerDefaults,
      ...options,
      prompt: input.prompt,
      duration: normalizedDuration,
      aspect_ratio: normalizeVideoRatio(input.ratio ?? input.aspect_ratio, input.model),
      resolution: meta.parameters?.resolution ? normalizeVideoResolution(input.resolution, input.model) : options.resolution,
      image_url: input.image_url ?? options.image_url,
      image_urls: input.image_url ? [input.image_url] : options.image_urls,
      image_files: input.image_url ? [input.image_url] : options.image_files,
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
