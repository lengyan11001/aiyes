import { estimateGenerationPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import type { MenuUser } from "@/components/user-menu";
import type { WorkbenchJob } from "@/components/generation-workbench";

export async function getWorkbenchData(user: {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  balanceCents: number;
}) {
  const menuUser: MenuUser = {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    balanceCents: user.balanceCents,
  };

  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      kind: true,
      model: true,
      status: true,
      prompt: true,
      result: true,
      error: true,
      chargedCents: true,
      upstreamTaskId: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const initialJobs: WorkbenchJob[] = jobs.map((job) => ({
    ...job,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  }));

  return {
    initialJobs,
    estimatedPrices: {
      IMAGE: estimateGenerationPrice({ model: "openai/gpt-image-2" }).points,
      VIDEO: estimateGenerationPrice({ model: "seedance2", duration: 4 }).points,
    },
    user: menuUser,
  };
}
