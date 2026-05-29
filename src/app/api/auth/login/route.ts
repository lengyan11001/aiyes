import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";

const schema = z.object({
  username: z.string().trim().min(1).max(64).optional(),
  email: z.string().trim().min(1).max(64).optional(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("账号或密码格式不正确。", 422, "validation_error");

  const account = (parsed.data.username || parsed.data.email || "").trim();
  if (!account) return jsonError("账号或密码格式不正确。", 422, "validation_error");
  const username = account.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: account }, { email: username }],
    },
  });
  if (!user || user.status !== "ACTIVE") return jsonError("账号或密码错误。", 401, "invalid_login");

  const ok = await compare(parsed.data.password, user.passwordHash);
  if (!ok) return jsonError("账号或密码错误。", 401, "invalid_login");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ sub: user.id, username: user.username, email: user.email, role: user.role });
  return NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
}
