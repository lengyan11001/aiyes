import { JobKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createApizTask, waitApizTask } from "@/lib/apiz";
import { applyUpstreamCharge, debitForJob, priceForModel, refundJobCharge } from "@/lib/billing";
import { isAllowedModel, modelKind, upstreamModelId, type AllowedModel } from "@/lib/constants";
import { clientIp, jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { buildProviderParams } from "@/lib/provider-params";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";

const schema = z.object({
  kind: z.enum(["IMAGE", "VIDEO"]),
  model: z.string(),
  prompt: z.string().min(1).max(5000),
  image_url: z.string().url().optional(),
  aspect_ratio: z.string().optional(),
  ratio: z.string().optional(),
  duration: z.union([z.string(), z.number()]).optional(),
  size: z.string().optional(),
  quality: z.string().optional(),
  video_model: z.string().optional(),
  resolution: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  async: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");

  const rate = await consumeRateLimit(`user:${user.id}:generate`, 1);
  if (!rate.ok) {
    return NextResponse.json(
      { error: { message: "请求过于频繁，请稍后再试。", code: "rate_limited" } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("任务参数不正确。", 422, "validation_error");

  const body = parsed.data;
  if (!isAllowedModel(body.model)) return jsonError("模型不可用。", 400, "model_not_allowed");
  if (modelKind(body.model) !== body.kind) return jsonError("模型类型与任务类型不匹配。", 400, "model_kind_mismatch");
  const model = body.model as AllowedModel;

  const price = priceForModel(model, {
    duration: body.duration,
    quality: body.quality,
    videoModel: body.video_model,
    resolution: body.resolution,
    size: body.size,
    aspectRatio: body.aspect_ratio || body.ratio,
  });
  let job;
  try {
    job = await prisma.$transaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          userId: user.id,
          kind: body.kind === "IMAGE" ? JobKind.IMAGE : JobKind.VIDEO,
          model,
          prompt: body.prompt,
          params: body as never,
          chargedCents: price,
          clientIp: clientIp(request.headers),
        },
      });
      await debitForJob({
        tx,
        userId: user.id,
        jobId: created.id,
        model,
        amountCents: price,
      });
      return created;
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "余额不足，请先充值。", 402, "insufficient_balance");
  }

  try {
    const providerParams = buildProviderParams({ ...body, model });
    const task = await createApizTask(upstreamModelId(model), providerParams);
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
            completedAt: final.status === "completed" || final.status === "failed" ? new Date() : undefined,
          },
        });
        await prisma.$transaction((tx) =>
          applyUpstreamCharge({ tx, jobId: job.id, status: updated.status, upstreamPrice: final.price }),
        );
      }
    }

    const settled = await prisma.generationJob.findUnique({ where: { id: job.id } });
    return NextResponse.json({ job: settled || updated });
  } catch (error) {
    const updated = await prisma.$transaction(async (tx) => {
      await refundJobCharge({ tx, jobId: job.id });
      return tx.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : String(error), completedAt: new Date() },
      });
    });
    return NextResponse.json({ job: updated, error: updated.error }, { status: 502 });
  }
}
