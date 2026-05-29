import { UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("需要管理员权限。", 403, "forbidden");
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("状态参数错误。", 422, "validation_error");
  const { id } = await context.params;
  if (id === admin.id && parsed.data.status === UserStatus.DISABLED) {
    return jsonError("不能禁用当前管理员账号。", 400, "self_disable_not_allowed");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
    select: { id: true, username: true, status: true },
  });
  return NextResponse.json({ user });
}
