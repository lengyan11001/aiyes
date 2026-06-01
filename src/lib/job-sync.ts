import type { GenerationJob, JobStatus, Prisma } from "@prisma/client";
import { queryApizTask, type ApizQueryResponse } from "./apiz";
import { applyUpstreamCharge } from "./billing";
import { prisma } from "./prisma";

type SyncableJob = Pick<GenerationJob, "id" | "status" | "upstreamTaskId">;

const unfinishedStatuses: JobStatus[] = ["PENDING", "PROCESSING"];

function upstreamStatus(status: ApizQueryResponse["status"]): JobStatus {
  if (status === "completed") return "COMPLETED";
  if (status === "failed") return "FAILED";
  if (status === "processing") return "PROCESSING";
  return "PENDING";
}

function upstreamCompletedAt(upstream: ApizQueryResponse) {
  if (!upstream.completed_at) return new Date();
  const value = new Date(upstream.completed_at);
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

function updateDataForUpstream(upstream: ApizQueryResponse, status: JobStatus) {
  const terminal = status === "COMPLETED" || status === "FAILED";
  return {
    status,
    result: upstream.result === undefined ? undefined : (upstream.result as Prisma.InputJsonValue),
    error: upstream.error,
    upstreamPrice: upstream.price,
    completedAt: terminal ? upstreamCompletedAt(upstream) : undefined,
  };
}

export async function syncGenerationJob(job: SyncableJob) {
  if (!job.upstreamTaskId || !unfinishedStatuses.includes(job.status)) {
    const current = await prisma.generationJob.findUniqueOrThrow({ where: { id: job.id } });
    return { job: current, upstream: null, changed: false };
  }

  const upstream = await queryApizTask(job.upstreamTaskId, 12_000);
  const status = upstreamStatus(upstream.status);
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.generationJob.updateMany({
      where: { id: job.id, status: { in: unfinishedStatuses } },
      data: updateDataForUpstream(upstream, status),
    });
    if (saved.count === 1) {
      await applyUpstreamCharge({ tx, jobId: job.id, status, upstreamPrice: upstream.price });
    }
    return tx.generationJob.findUniqueOrThrow({ where: { id: job.id } });
  });

  return { job: updated, upstream, changed: true };
}

export async function syncPendingGenerationJobs({
  take = 20,
  userId,
}: {
  take?: number;
  userId?: string;
} = {}) {
  const jobs = await prisma.generationJob.findMany({
    where: {
      status: { in: unfinishedStatuses },
      upstreamTaskId: { not: null },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id: true,
      status: true,
      upstreamTaskId: true,
    },
  });

  const results: Array<{
    id: string;
    status?: JobStatus;
    upstreamStatus?: ApizQueryResponse["status"];
    error?: string;
  }> = [];

  for (const job of jobs) {
    try {
      const synced = await syncGenerationJob(job);
      results.push({
        id: job.id,
        status: synced.job.status,
        upstreamStatus: synced.upstream?.status,
      });
    } catch (error) {
      results.push({
        id: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    scanned: jobs.length,
    completed: results.filter((result) => result.status === "COMPLETED").length,
    failed: results.filter((result) => result.status === "FAILED").length,
    errors: results.filter((result) => result.error).length,
    results,
  };
}
