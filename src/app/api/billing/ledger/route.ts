import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { publicGenerationModelLabel } from "@/lib/model-display";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const ledgers = await prisma.usageLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      job: {
        select: {
          model: true,
          params: true,
        },
      },
    },
  });
  return NextResponse.json({
    ledgers: ledgers.map(({ job, ...ledger }) => ({
      ...ledger,
      model: job ? publicGenerationModelLabel(job.model, job.params) : ledger.model,
    })),
  });
}
