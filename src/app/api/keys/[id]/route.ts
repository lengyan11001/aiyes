import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  quotaCents: z.number().int().min(0).max(100000000).nullable().optional(),
  requestLimit: z.number().int().min(0).max(10000000).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("参数格式不正确。", 422, "validation_error");

  const updated = await prisma.apiKey.updateMany({
    where: { id, userId: user.id, status: "ACTIVE" },
    data: parsed.data,
  });

  if (updated.count !== 1) return jsonError("API Key 不存在。", 404, "not_found");

  const key = await prisma.apiKey.findFirstOrThrow({
    where: { id, userId: user.id },
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
  return NextResponse.json({ key });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return jsonError("请先登录。", 401, "unauthorized");
  const { id } = await context.params;
  await prisma.apiKey.updateMany({
    where: { id, userId: user.id },
    data: { status: "REVOKED" },
  });
  return NextResponse.json({ ok: true });
}
