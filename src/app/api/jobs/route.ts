import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { syncPendingGenerationJobs } from "@/lib/job-sync";
import { publicGenerationModelLabel } from "@/lib/model-display";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  await syncPendingGenerationJobs({ userId: user.id, take: 10 });
  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      model: true,
      params: true,
      status: true,
      prompt: true,
      chargedCents: true,
      result: true,
      error: true,
      upstreamTaskId: true,
      createdAt: true,
      completedAt: true,
    },
  });
  return NextResponse.json({
    jobs: jobs.map(({ params, ...job }) => ({
      ...job,
      displayModel: publicGenerationModelLabel(job.model, params),
    })),
  });
}
