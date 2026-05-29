import { NextResponse } from "next/server";
import { queryApizTask } from "@/lib/apiz";
import { authenticateApiKey } from "@/lib/api-auth";
import { applyUpstreamCharge } from "@/lib/billing";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return jsonError("Invalid API key.", 401, "invalid_api_key");
  }
  const { id } = await context.params;
  const job = await prisma.generationJob.findFirst({
    where: { id, userId: auth.userId },
  });
  if (!job) return jsonError("Job not found.", 404, "not_found");

  if (job.upstreamTaskId && ["PENDING", "PROCESSING"].includes(job.status)) {
    try {
      const upstream = await queryApizTask(job.upstreamTaskId);
      const status =
        upstream.status === "completed"
          ? "COMPLETED"
          : upstream.status === "failed"
            ? "FAILED"
            : upstream.status === "processing"
              ? "PROCESSING"
              : "PENDING";
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
    } catch {
      // Return local state if upstream polling fails.
    }
  }

  return NextResponse.json({ job });
}
