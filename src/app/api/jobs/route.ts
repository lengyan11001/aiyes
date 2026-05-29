import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      kind: true,
      model: true,
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
  return NextResponse.json({ jobs });
}
