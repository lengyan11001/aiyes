import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("需要管理员权限。", 403, "forbidden");

  const [users, jobs, pendingJobs, revenue, recentJobs, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.generationJob.count(),
    prisma.generationJob.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.usageLedger.aggregate({ where: { type: "DEBIT" }, _sum: { amountCents: true } }),
    prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, username: true, email: true, role: true, status: true, balanceCents: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    stats: {
      users,
      jobs,
      pendingJobs,
      revenueCents: Math.abs(revenue._sum.amountCents ?? 0),
    },
    recentJobs,
    recentUsers,
  });
}
