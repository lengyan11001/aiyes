import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedModel, type AllowedModel } from "@/lib/constants";
import { jsonError, readJsonBody } from "@/lib/http";
import { estimateGenerationPrice, type PriceEstimateInput } from "@/lib/pricing";

const schema = z.object({
  model: z.string(),
  duration: z.union([z.string(), z.number()]).optional(),
  quality: z.string().optional(),
  videoModel: z.string().optional(),
  video_model: z.string().optional(),
  resolution: z.string().optional(),
  size: z.string().optional(),
  image_size: z.string().optional(),
  aspectRatio: z.string().optional(),
  aspect_ratio: z.string().optional(),
  ratio: z.string().optional(),
});

function queryPayload(request: Request) {
  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams.entries());
}

async function requestPayload(request: Request) {
  if (request.method === "GET") return queryPayload(request);
  return readJsonBody(request);
}

export async function parsePriceEstimateRequest(request: Request) {
  const parsed = schema.safeParse(await requestPayload(request));
  if (!parsed.success || !isAllowedModel(parsed.data.model)) return null;

  const data = parsed.data;
  return {
    model: data.model as AllowedModel,
    duration: data.duration,
    quality: data.quality,
    videoModel: data.videoModel ?? data.video_model,
    resolution: data.resolution,
    size: data.size ?? data.image_size,
    aspectRatio: data.aspectRatio ?? data.aspect_ratio ?? data.ratio,
  } satisfies PriceEstimateInput;
}

export async function priceEstimateResponse(request: Request) {
  const input = await parsePriceEstimateRequest(request);
  if (!input) {
    return jsonError("价格参数不正确。", 422, "validation_error");
  }

  return NextResponse.json({
    estimate: estimateGenerationPrice(input),
    request: input,
  });
}
