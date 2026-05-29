import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "aiyes_session";

const key = new TextEncoder().encode(env.APP_SECRET);

export interface SessionPayload {
  sub: string;
  username?: string;
  email?: string | null;
  role: UserRole;
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(key);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, key);
    const payload = verified.payload as unknown as SessionPayload;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.sub, status: "ACTIVE" },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      balanceCents: true,
      createdAt: true,
      status: true,
    },
  });
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
