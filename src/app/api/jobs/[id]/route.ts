import { NextResponse } from "next/server";
import { queryApizTask } from "@/lib/apiz";
import { applyUpstreamCharge } from "@/lib/billing";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function upstreamStatus(status: string) {
  if (status === "completed") return "COMPLETED";
  if (status === "failed") return "FAILED";
  if (status === "processing") return "PROCESSING";
  return "PENDING";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");

  const { id } = await context.params;
  const job = await prisma.generationJob.findFirst({
    where: { id, userId: user.id },
  });
  if (!job) return jsonError("任务不存在。", 404, "not_found");

  if (job.upstreamTaskId && ["PENDING", "PROCESSING"].includes(job.status)) {
    try {
      const upstream = await queryApizTask(job.upstreamTaskId);
      const status = upstreamStatus(upstream.status);
      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.generationJob.updateMany({
          where: { id: job.id, status: { in: ["PENDING", "PROCESSING"] } },
          data:
            status === "COMPLETED" || status === "FAILED"
              ? {
                  status,
                  result: upstream.result === undefined ? undefined : (upstream.result as never),
                  error: upstream.error,
                  upstreamPrice: upstream.price,
                  completedAt: new Date(),
                }
              : {
                  status,
                  result: upstream.result === undefined ? undefined : (upstream.result as never),
                  error: upstream.error,
                  upstreamPrice: upstream.price,
                },
        });
        if (saved.count === 1) {
          await applyUpstreamCharge({ tx, jobId: job.id, status, upstreamPrice: upstream.price });
        }
        return tx.generationJob.findUniqueOrThrow({ where: { id: job.id } });
      });
      return NextResponse.json({ job: updated });
    } catch (error) {
      return NextResponse.json({
        job,
        warning: error instanceof Error ? error.message : "同步任务状态失败。",
      });
    }
  }

  return NextResponse.json({ job });
}
