import { NextResponse } from "next/server";
import { MODEL_CATALOG, type AllowedModel } from "@/lib/constants";
import { estimateGenerationPrice, VIDEO_MODEL_OPTIONS } from "@/lib/pricing";
import { referenceCapabilitiesForModel, referenceInputMeta } from "@/lib/reference-capabilities";

function seedanceRequestParameters() {
  return [
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
  ];
}

export async function GET() {
  return NextResponse.json({
    object: "list",
    data: MODEL_CATALOG.map((entry) => {
      const model = entry as (typeof MODEL_CATALOG)[number] & { default?: boolean; requiresImage?: boolean };
      const defaultEstimate = estimateGenerationPrice({ model: model.id as AllowedModel });
      const referenceInputs = referenceInputMeta(referenceCapabilitiesForModel(model.id));
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
                request_parameters: seedanceRequestParameters(),
              }
            : {}),
          ...(referenceInputs ? { reference_inputs: referenceInputs } : {}),
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
