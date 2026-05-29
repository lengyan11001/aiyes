import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  password: z.string().min(8).max(128),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("需要管理员权限。", 403, "forbidden");
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("密码至少 8 位。", 422, "validation_error");
  const { id } = await context.params;

  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash: await hash(parsed.data.password, 12) },
    select: { id: true, username: true, updatedAt: true },
  });
  return NextResponse.json({ user });
}
