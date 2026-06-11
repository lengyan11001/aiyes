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
