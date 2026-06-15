import { NextResponse } from "next/server";
import { MODEL_CATALOG, type AllowedModel } from "@/lib/constants";
import { estimateGenerationPrice, VIDEO_MODEL_OPTIONS } from "@/lib/pricing";

export async function GET() {
  return NextResponse.json({
    object: "list",
    data: MODEL_CATALOG.map((entry) => {
      const model = entry as (typeof MODEL_CATALOG)[number] & { default?: boolean; requiresImage?: boolean };
      const defaultEstimate = estimateGenerationPrice({ model: model.id as AllowedModel });
      return {
        id: model.id,
        object: "model",
        owned_by: "aiyes",
        permission: [],
        meta: {
          label: model.label,
          kind: model.kind,
          taskType: model.taskType,
          description: model.description,
          summary: model.summary,
          pricingLabel: model.pricingLabel,
          default: Boolean(model.default),
          parameters: model.parameters ?? {},
          ...(model.id === "seedance2"
            ? {
                video_model_options: VIDEO_MODEL_OPTIONS.map(({ value, label, pointsPerSecond, resolutions }) => ({
                  value,
                  label,
                  pointsPerSecond,
                  resolutions,
                })),
                reference_inputs: {
                  functionMode: {
                    type: "string",
                    values: ["omini", "first_last_frame"],
                    default: "omini",
                  },
                  image_url: {
                    type: "url",
                    description: "首尾帧模式下的首帧图片 URL；非首尾帧模式也可作为单张参考图使用。",
                  },
                  end_image_url: {
                    type: "url",
                    description: "首尾帧模式下的尾帧图片 URL，需搭配 image_url。",
                  },
                  image_files: {
                    type: "array<url>",
                    maxItems: 9,
                    formats: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
                    minSize: "300px",
                  },
                  video_url: {
                    type: "url",
                    description: "单个参考视频 URL。",
                  },
                  video_files: {
                    type: "array<url>",
                    maxItems: 3,
                    formats: ["mp4", "mov", "avi", "mkv", "webm", "flv"],
                    itemDuration: "2-15.5s",
                    totalDuration: "<=15.5s",
                    maxSize: "50MB",
                    fps: "24-60",
                  },
                  audio_files: {
                    type: "array<url>",
                    maxItems: 3,
                    formats: ["mp3", "wav"],
                    itemDuration: "2-15s",
                    totalSize: "<=15MB",
                    note: "需搭配图片或视频使用。",
                  },
                  seed: {
                    type: "integer",
                    required: false,
                  },
                },
                request_parameters: [
                  { name: "model", type: "string", required: true, values: ["seedance2"] },
                  { name: "prompt", type: "string", required: true, maxLength: 5000 },
                  { name: "duration", type: "integer", required: false, min: 4, max: 15, default: 4 },
                  { name: "ratio", type: "string", required: false, values: ["16:9", "21:9", "9:16", "1:1", "4:3", "3:4"], default: "1:1" },
                  { name: "aspect_ratio", type: "string", required: false, values: ["16:9", "21:9", "9:16", "1:1", "4:3", "3:4"] },
                  { name: "video_model", type: "string", required: false, values: ["fast", "standard", "fast_vip", "standard_vip"], default: "fast" },
                  { name: "resolution", type: "string", required: false, values: ["480p", "720p", "1080p"], default: "720p" },
                  { name: "functionMode", type: "string", required: false, values: ["omini", "first_last_frame"], default: "omini" },
                  { name: "image_url", type: "url", required: false },
                  { name: "end_image_url", type: "url", required: false },
                  { name: "image_files", type: "array<url>", required: false, maxItems: 9 },
                  { name: "video_url", type: "url", required: false },
                  { name: "video_files", type: "array<url>", required: false, maxItems: 3 },
                  { name: "audio_files", type: "array<url>", required: false, maxItems: 3 },
                  { name: "seed", type: "integer", required: false },
                  { name: "async", type: "boolean", required: false, default: true },
                ],
              }
            : {}),
          pricing: {
            unit: "points",
            label: model.pricingLabel,
            default_points: defaultEstimate.points,
            default_detail: defaultEstimate.detail,
          },
          requiresImage: Boolean(model.requiresImage),
        },
      };
    }),
  });
}
