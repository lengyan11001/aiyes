import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl =
  process.env.DATABASE_URL || "postgresql://aiyes:change-me@localhost:5432/aiyes?schema=public";
const apiKey = process.env.APIZ_API_KEY;
const baseUrl = (process.env.APIZ_BASE_URL || "https://api.apiz.ai").replace(/\/+$/, "");
const take = Number(process.env.JOB_SYNC_TAKE || 30);
const queryTimeoutMs = Number(process.env.JOB_SYNC_QUERY_TIMEOUT_MS || 12000);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

function statusFromUpstream(status) {
  if (status === "completed") return "COMPLETED";
  if (status === "failed") return "FAILED";
  if (status === "processing") return "PROCESSING";
  return "PENDING";
}

function completedAt(upstream) {
  if (!upstream.completed_at) return new Date();
  const value = new Date(upstream.completed_at);
  return Number.isNaN(value.getTime()) ? new Date() : value;
}

async function queryTask(taskId) {
  if (!apiKey) throw new Error("APIZ_API_KEY is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), queryTimeoutMs);
  try {
    const response = await fetch(`${baseUrl}/api/v3/tasks/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ task_id: taskId }),
      signal: controller.signal,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(payload?.message || payload?.detail || `APIZ returned HTTP ${response.status}`);
    }
    return payload?.data ?? payload;
  } finally {
    clearTimeout(timer);
  }
}

async function refundFailedJob(tx, job) {
  if (job.chargedCents <= 0) return;
  const user = await tx.user.update({
    where: { id: job.userId },
    data: { balanceCents: { increment: job.chargedCents } },
  });
  const debit = await tx.usageLedger.findFirst({
    where: { jobId: job.id, type: "DEBIT" },
    orderBy: { createdAt: "asc" },
  });
  if (debit) {
    await tx.usageLedger.update({
      where: { id: debit.id },
      data: {
        amountCents: 0,
        balanceAfter: user.balanceCents,
        note: "provider_failed_before_price",
      },
    });
  }
  if (job.apiKeyId) {
    await tx.$executeRaw`
      UPDATE "ApiKey"
      SET "usedCents" = GREATEST("usedCents" - ${job.chargedCents}, 0),
          "updatedAt" = NOW()
      WHERE "id" = ${job.apiKeyId}
    `;
  }
}

async function syncJob(job) {
  const upstream = await queryTask(job.upstreamTaskId);
  const status = statusFromUpstream(upstream.status);
  await prisma.$transaction(async (tx) => {
    const current = await tx.generationJob.findFirst({
      where: { id: job.id, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (!current) return;
    await tx.generationJob.update({
      where: { id: current.id },
      data: {
        status,
        result: upstream.result === undefined ? undefined : upstream.result,
        error: upstream.error,
        upstreamPrice: upstream.price,
        completedAt: status === "COMPLETED" || status === "FAILED" ? completedAt(upstream) : undefined,
      },
    });
    if (status === "FAILED") {
      await refundFailedJob(tx, current);
      await tx.generationJob.update({ where: { id: current.id }, data: { chargedCents: 0 } });
    }
  });
  return { id: job.id, status, upstreamStatus: upstream.status };
}

async function main() {
  const jobs = await prisma.generationJob.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      upstreamTaskId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id: true,
      status: true,
      upstreamTaskId: true,
    },
  });
  const results = [];
  for (const job of jobs) {
    try {
      results.push(await syncJob(job));
    } catch (error) {
      results.push({ id: job.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  console.log(JSON.stringify({ scanned: jobs.length, results }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
