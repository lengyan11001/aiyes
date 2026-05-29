import { JobKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createApizTask, waitApizTask } from "@/lib/apiz";
import { authenticateApiKey, bearerToken } from "@/lib/api-auth";
import { applyUpstreamCharge, billingErrorCode, debitForJob, priceForModel, refundJobCharge } from "@/lib/billing";
import { isAllowedModel, modelKind, upstreamModelId, type AllowedModel } from "@/lib/constants";
import { clientIp, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildProviderParams } from "@/lib/provider-params";
import { consumeRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  model: z.string(),
  prompt: z.string().min(1).max(5000),
  image_url: z.string().url().optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  aspect_ratio: z.string().optional(),
  ratio: z.string().optional(),
  quality: z.string().optional(),
  video_model: z.string().optional(),
  resolution: z.string().optional(),
  async: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return jsonError("Missing Bearer API key.", 401, "missing_api_key");
  const apiKey = await authenticateApiKey(request);
  if (!apiKey) {
    return jsonError("Invalid API key.", 401, "invalid_api_key");
  }

  const rate = await consumeRateLimit(`key:${apiKey.id}`, 1);
  if (!rate.ok) {
    return NextResponse.json(
      { error: { message: "Too many requests.", code: "rate_limited" } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 422, "validation_error");
  const body = parsed.data;
  if (!isAllowedModel(body.model) || modelKind(body.model) !== "VIDEO") {
    return jsonError("Video model is not enabled.", 400, "model_not_allowed");
  }
  const model = body.model as AllowedModel;
  if (apiKey.allowedModels.length > 0 && !apiKey.allowedModels.includes(model)) {
    return jsonError("Model is not enabled for this API key.", 400, "model_not_allowed");
  }

  const price = priceForModel(model, {
    duration: body.duration,
    aspectRatio: body.aspect_ratio || body.ratio,
    quality: body.quality,
    videoModel: body.video_model,
    resolution: body.resolution,
  });
  let job;
  try {
    job = await prisma.$transaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          kind: JobKind.VIDEO,
          model,
          prompt: body.prompt,
          params: body as never,
          chargedCents: price,
          clientIp: clientIp(request.headers),
        },
      });
      await debitForJob({
        tx,
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        jobId: created.id,
        model,
        amountCents: price,
      });
      return created;
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "余额不足。", 402, billingErrorCode(error));
  }

  try {
    const task = await createApizTask(upstreamModelId(model), buildProviderParams({ ...body, model }));
    const status =
      task.status === "completed" ? "COMPLETED" : task.status === "failed" ? "FAILED" : "PROCESSING";
    let updated = await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        upstreamTaskId: task.task_id,
        status,
        result: task.result === undefined ? undefined : (task.result as never),
        upstreamPrice: task.price,
        completedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
      },
    });
    await prisma.$transaction((tx) =>
      applyUpstreamCharge({ tx, jobId: job.id, status, upstreamPrice: task.price }),
    );
    if (!body.async && status !== "COMPLETED") {
      const final = await waitApizTask(task.task_id);
      if (final) {
        updated = await prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status:
              final.status === "completed"
                ? "COMPLETED"
                : final.status === "failed"
                  ? "FAILED"
                  : "PROCESSING",
            result: final.result === undefined ? undefined : (final.result as never),
            error: final.error,
            upstreamPrice: final.price,
            completedAt:
              final.status === "completed" || final.status === "failed" ? new Date() : undefined,
          },
        });
        await prisma.$transaction((tx) =>
          applyUpstreamCharge({ tx, jobId: job.id, status: updated.status, upstreamPrice: final.price }),
        );
      }
    }
    const settled = await prisma.generationJob.findUnique({ where: { id: job.id } });
    updated = settled || updated;
    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    return NextResponse.json({ id: updated.id, object: "video.generation", status: updated.status, result: updated.result });
  } catch (error) {
    const updated = await prisma.$transaction(async (tx) => {
      await refundJobCharge({ tx, jobId: job.id });
      return tx.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : String(error), completedAt: new Date() },
      });
    });
    return NextResponse.json({ id: updated.id, status: updated.status, error: updated.error }, { status: 502 });
  }
}
