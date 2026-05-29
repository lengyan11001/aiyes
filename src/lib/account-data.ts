import { prisma } from "@/lib/prisma";
import { ALLOWED_MODELS } from "@/lib/constants";
import { createPlatformApiKey } from "@/lib/crypto";

export function ledgerName(type: string) {
  if (type === "CREDIT") return "充值";
  if (type === "DEBIT") return "消费";
  if (type === "REFUND") return "退款";
  return "调整";
}

export function menuUser(user: {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  role: string;
  balanceCents: number;
}) {
  return {
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    balanceCents: user.balanceCents,
  };
}

export function getUserLedgers(userId: string) {
  return prisma.usageLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
}

export function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      secretPlain: true,
      status: true,
      quotaCents: true,
      requestLimit: true,
      usedCents: true,
      usedRequests: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

export async function createDefaultApiKey(userId: string) {
  const key = createPlatformApiKey();
  const record = await prisma.apiKey.create({
    data: {
      userId,
      name: "默认稳定 Token",
      prefix: key.prefix,
      last4: key.last4,
      keyHash: key.hash,
      secretPlain: key.plain,
      allowedModels: [...ALLOWED_MODELS],
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      secretPlain: true,
      status: true,
      quotaCents: true,
      requestLimit: true,
      usedCents: true,
      usedRequests: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return record;
}

export async function ensureUserApiKey(userId: string) {
  const existing = await prisma.apiKey.findFirst({
    where: { userId, status: "ACTIVE", secretPlain: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      secretPlain: true,
      status: true,
      quotaCents: true,
      requestLimit: true,
      usedCents: true,
      usedRequests: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return existing ?? createDefaultApiKey(userId);
}
