import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { syncGenerationJob } from "@/lib/job-sync";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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
      const synced = await syncGenerationJob(job);
      return NextResponse.json({ job: synced.job });
    } catch (error) {
      return NextResponse.json({
        job,
        warning: error instanceof Error ? error.message : "同步任务状态失败。",
      });
    }
  }

  return NextResponse.json({ job });
}
