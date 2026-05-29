import { hash } from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ALLOWED_MODELS } from "@/lib/constants";
import { createPlatformApiKey } from "@/lib/crypto";
import { jsonError, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[\p{L}\p{N}_.-]+$/u)
    .optional(),
  email: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[\p{L}\p{N}_.-]+$/u)
    .optional(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("账号需 3-40 位，可用中文、字母、数字、下划线、点和横线；密码至少 8 位。", 422, "validation_error");

  const account = (parsed.data.username || parsed.data.email || "").trim();
  if (!account) return jsonError("账号需 3-40 位，可用中文、字母、数字、下划线、点和横线；密码至少 8 位。", 422, "validation_error");

  const username = account.toLowerCase();
  const { password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return jsonError("该账号已注册。", 409, "username_exists");

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? UserRole.ADMIN : UserRole.USER;
  const apiKey = createPlatformApiKey();
  const user = await prisma.user.create({
    data: {
      username,
      email: null,
      name,
      role,
      passwordHash: await hash(password, 12),
      balanceCents: 0,
      apiKeys: {
        create: {
          name: "默认稳定 Token",
          prefix: apiKey.prefix,
          last4: apiKey.last4,
          keyHash: apiKey.hash,
          secretPlain: apiKey.plain,
          allowedModels: [...ALLOWED_MODELS],
        },
      },
    },
    select: { id: true, username: true, name: true, role: true },
  });

  await setSessionCookie({ sub: user.id, username: user.username, role: user.role });
  return NextResponse.json({ user, apiKey: { token: apiKey.plain } });
}
