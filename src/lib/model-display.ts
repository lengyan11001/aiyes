import { MODEL_META } from "@/lib/constants";
import { normalizeVideoModel, normalizeVideoResolution, VIDEO_MODEL_OPTIONS } from "@/lib/pricing";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function publicGenerationModelLabel(model: string, params?: unknown) {
  const meta = MODEL_META[model];
  if (model !== "seedance2") {
    return meta?.shortLabel ?? meta?.label ?? model;
  }

  const input = objectValue(params);
  const rawVideoModel = firstString(input.video_model, input.videoModel, input.quality);
  const rawResolution = firstString(input.resolution);
  const videoModel = normalizeVideoModel(rawVideoModel);
  const resolution = normalizeVideoResolution(rawResolution, "seedance2", videoModel);
  const tier = VIDEO_MODEL_OPTIONS.find((option) => option.value === videoModel)?.label ?? "fast";

  return `${meta?.label ?? model} ${tier} ${resolution}`;
}
