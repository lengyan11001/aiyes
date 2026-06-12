import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { syncGenerationJob } from "@/lib/job-sync";
import { publicGenerationModelLabel } from "@/lib/model-display";
import { prisma } from "@/lib/prisma";

function withDisplayModel<T extends { model: string; params?: unknown }>(job: T) {
  return {
    ...job,
    displayModel: publicGenerationModelLabel(job.model, job.params),
  };
}

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
      const synced = await syncGenerationJob(job);
      return NextResponse.json({ job: withDisplayModel(synced.job) });
    } catch {
      // Return local state if upstream polling fails.
    }
  }

  return NextResponse.json({ job: withDisplayModel(job) });
}
