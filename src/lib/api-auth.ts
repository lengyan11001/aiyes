import { sha256 } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
}

export async function authenticateApiKey(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: sha256(token), status: "ACTIVE" },
    include: { user: true },
  });
  if (!apiKey || apiKey.user.status !== "ACTIVE") return null;
  return apiKey;
}

export type ApiKeyAuth = NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>;
