import { LedgerType, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { AllowedModel } from "./constants";
import { estimateGenerationPrice, type PriceEstimateInput } from "./pricing";

export function priceForModel(model: AllowedModel, params: Omit<PriceEstimateInput, "model"> = {}) {
  return estimateGenerationPrice({ model, ...params }).points;
}

export function upstreamPriceToPoints(price: unknown) {
  if (price === null || price === undefined) return null;
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.ceil(value);
}

export function billingErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/API key quota|request limit/i.test(message)) return "api_key_limit_exhausted";
  return "insufficient_balance";
}

type ClaimedJobCharge = {
  id: string;
  userId: string;
  apiKeyId: string | null;
  model: string;
  previousChargedCents: number;
};

async function claimJobChargeChange({
  tx,
  jobId,
  nextChargedCents,
}: {
  tx: Prisma.TransactionClient;
  jobId: string;
  nextChargedCents: number;
}) {
  const rows = await tx.$queryRaw<ClaimedJobCharge[]>`
    WITH locked AS (
      SELECT "id", "userId", "apiKeyId", "model", "chargedCents"
      FROM "GenerationJob"
      WHERE "id" = ${jobId}
        AND "chargedCents" <> ${nextChargedCents}
      FOR UPDATE
    ),
    updated AS (
      UPDATE "GenerationJob" AS target
      SET "chargedCents" = ${nextChargedCents},
          "updatedAt" = NOW()
      FROM locked
      WHERE target."id" = locked."id"
      RETURNING target."id"
    )
    SELECT locked."id",
           locked."userId",
           locked."apiKeyId",
           locked."model",
           locked."chargedCents"::integer AS "previousChargedCents"
    FROM locked
    JOIN updated ON updated."id" = locked."id"
  `;

  return rows[0] ?? null;
}

async function reduceApiKeyUsedCents({
  tx,
  apiKeyId,
  amountCents,
}: {
  tx: Prisma.TransactionClient;
  apiKeyId: string;
  amountCents: number;
}) {
  await tx.$executeRaw`
    UPDATE "ApiKey"
    SET "usedCents" = GREATEST("usedCents" - ${amountCents}, 0),
        "updatedAt" = NOW()
    WHERE "id" = ${apiKeyId}
  `;
}

export async function assertSufficientBalance({
  userId,
  amountCents,
}: {
  userId: string;
  amountCents: number;
}) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      balanceCents: { gte: amountCents },
    },
    select: { id: true },
  });
  if (!user) throw new Error("Insufficient balance.");
}

export async function debitForJob({
  tx,
  userId,
  apiKeyId,
  jobId,
  model,
  amountCents,
  allowNegative = false,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
  apiKeyId?: string | null;
  jobId: string;
  model: string;
  amountCents: number;
  allowNegative?: boolean;
}) {
  if (apiKeyId) {
    const reserved = await tx.$executeRaw`
      UPDATE "ApiKey"
      SET "usedCents" = "usedCents" + ${amountCents},
          "usedRequests" = "usedRequests" + 1,
          "updatedAt" = NOW()
      WHERE "id" = ${apiKeyId}
        AND "userId" = ${userId}
        AND "status" = 'ACTIVE'
        AND ("quotaCents" IS NULL OR "usedCents" + ${amountCents} <= "quotaCents")
        AND ("requestLimit" IS NULL OR "usedRequests" + 1 <= "requestLimit")
    `;
    if (reserved !== 1) {
      throw new Error("API key quota or request limit has been exhausted.");
    }
  }

  let user;
  if (allowNegative) {
    const updated = await tx.user.updateMany({
      where: { id: userId, status: "ACTIVE" },
      data: { balanceCents: { decrement: amountCents } },
    });
    if (updated.count !== 1) throw new Error("Insufficient balance.");
    user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  } else {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        balanceCents: { gte: amountCents },
        status: "ACTIVE",
      },
      data: { balanceCents: { decrement: amountCents } },
    });

    if (updated.count !== 1) {
      throw new Error("Insufficient balance.");
    }
    user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  }

  await tx.usageLedger.create({
    data: {
      userId,
      apiKeyId,
      jobId,
      type: LedgerType.DEBIT,
      amountCents: -amountCents,
      balanceAfter: user.balanceCents,
      model,
      note: "generation",
    },
  });

  return user.balanceCents;
}

export async function settleJobCharge({
  tx,
  jobId,
  upstreamPrice,
}: {
  tx: Prisma.TransactionClient;
  jobId: string;
  upstreamPrice: unknown;
}) {
  const actualPoints = upstreamPriceToPoints(upstreamPrice);
  if (actualPoints === null) return;

  const job = await claimJobChargeChange({ tx, jobId, nextChargedCents: actualPoints });
  if (!job) return;

  const diff = actualPoints - job.previousChargedCents;
  if (diff > 0 && job.apiKeyId) {
    const reserved = await tx.$executeRaw`
      UPDATE "ApiKey"
      SET "usedCents" = "usedCents" + ${diff},
          "updatedAt" = NOW()
      WHERE "id" = ${job.apiKeyId}
        AND "userId" = ${job.userId}
        AND "status" = 'ACTIVE'
        AND ("quotaCents" IS NULL OR "usedCents" + ${diff} <= "quotaCents")
    `;
    if (reserved !== 1) {
      throw new Error("API key quota is insufficient.");
    }
  }

  let user;
  if (diff > 0) {
    const updated = await tx.user.updateMany({
      where: { id: job.userId, status: "ACTIVE", balanceCents: { gte: diff } },
      data: { balanceCents: { decrement: diff } },
    });
    if (updated.count !== 1) {
      throw new Error("Insufficient balance for upstream price settlement.");
    }
    user = await tx.user.findUniqueOrThrow({ where: { id: job.userId } });
  } else {
    user = await tx.user.update({
      where: { id: job.userId },
      data: { balanceCents: { increment: Math.abs(diff) } },
    });
  }

  const debit = await tx.usageLedger.findFirst({
    where: { jobId: job.id, type: LedgerType.DEBIT },
    orderBy: { createdAt: "asc" },
  });

  if (debit) {
    await tx.usageLedger.update({
      where: { id: debit.id },
      data: {
        amountCents: -actualPoints,
        balanceAfter: user.balanceCents,
        note: "upstream_price",
      },
    });
  } else {
    await tx.usageLedger.create({
      data: {
        userId: job.userId,
        apiKeyId: job.apiKeyId,
        jobId: job.id,
        type: LedgerType.DEBIT,
        amountCents: -actualPoints,
        balanceAfter: user.balanceCents,
        model: job.model,
        note: "upstream_price",
      },
    });
  }

  if (job.apiKeyId && diff < 0) {
    await reduceApiKeyUsedCents({ tx, apiKeyId: job.apiKeyId, amountCents: Math.abs(diff) });
  }
}

export async function refundJobCharge({
  tx,
  jobId,
  note = "provider_failed_before_price",
}: {
  tx: Prisma.TransactionClient;
  jobId: string;
  note?: string;
}) {
  const job = await claimJobChargeChange({ tx, jobId, nextChargedCents: 0 });
  if (!job || job.previousChargedCents <= 0) return;

  const user = await tx.user.update({
    where: { id: job.userId },
    data: { balanceCents: { increment: job.previousChargedCents } },
  });

  const debit = await tx.usageLedger.findFirst({
    where: { jobId: job.id, type: LedgerType.DEBIT },
    orderBy: { createdAt: "asc" },
  });

  if (debit) {
    await tx.usageLedger.update({
      where: { id: debit.id },
      data: {
        amountCents: 0,
        balanceAfter: user.balanceCents,
        note,
      },
    });
  }

  if (job.apiKeyId) {
    await reduceApiKeyUsedCents({ tx, apiKeyId: job.apiKeyId, amountCents: job.previousChargedCents });
  }
}

export async function applyUpstreamCharge({
  tx,
  jobId,
  status,
}: {
  tx: Prisma.TransactionClient;
  jobId: string;
  status: string;
  upstreamPrice?: unknown;
}) {
  if (status === "FAILED") {
    await refundJobCharge({ tx, jobId });
  }
}

export async function creditUser({
  userId,
  amountCents,
  note,
}: {
  userId: string;
  amountCents: number;
  note: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { balanceCents: { increment: amountCents } },
    });
    await tx.usageLedger.create({
      data: {
        userId,
        type: LedgerType.CREDIT,
        amountCents,
        balanceAfter: user.balanceCents,
        note,
      },
    });
    return user;
  });
}

export async function markOrderPaid({
  orderId,
  paidAmountCents,
  transactionId,
  raw,
}: {
  orderId: string;
  paidAmountCents: number;
  transactionId?: string | null;
  raw?: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found.");
    if (order.status === OrderStatus.PAID) return order;
    if (order.status !== OrderStatus.PENDING) throw new Error("Order status cannot be credited.");
    if (order.amountCents !== paidAmountCents) throw new Error("Paid amount does not match the order amount.");

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: OrderStatus.PENDING },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        wxTransactionId: transactionId || order.wxTransactionId,
        raw: raw ?? order.raw ?? undefined,
      },
    });

    if (claimed.count !== 1) {
      return tx.order.findUniqueOrThrow({ where: { id: order.id } });
    }

    const user = await tx.user.update({
      where: { id: order.userId },
      data: { balanceCents: { increment: order.creditsCents } },
    });

    await tx.usageLedger.create({
      data: {
        userId: order.userId,
        type: LedgerType.CREDIT,
        amountCents: order.creditsCents,
        balanceAfter: user.balanceCents,
        note: `recharge:${order.id}`,
      },
    });

    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}
