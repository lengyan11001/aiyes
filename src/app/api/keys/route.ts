import { ApiKeyStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ALLOWED_MODELS } from "@/lib/constants";
import { createPlatformApiKey } from "@/lib/crypto";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).max(40).default("Default key"),
  quotaCents: z.number().int().min(0).max(100000000).nullable().optional(),
  requestLimit: z.number().int().min(0).max(10000000).nullable().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id, status: ApiKeyStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      status: true,
      allowedModels: true,
      secretPlain: true,
      quotaCents: true,
      requestLimit: true,
      usedCents: true,
      usedRequests: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("名称格式不正确。", 422, "validation_error");

  const key = createPlatformApiKey();
  const record = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      prefix: key.prefix,
      last4: key.last4,
      keyHash: key.hash,
      secretPlain: key.plain,
      quotaCents: parsed.data.quotaCents ?? null,
      requestLimit: parsed.data.requestLimit ?? null,
      allowedModels: [...ALLOWED_MODELS],
      status: ApiKeyStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      last4: true,
      secretPlain: true,
      status: true,
      allowedModels: true,
      quotaCents: true,
      requestLimit: true,
      usedCents: true,
      usedRequests: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return NextResponse.json({ key: record, secret: key.plain });
}
