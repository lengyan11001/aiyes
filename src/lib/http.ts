import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400, code = "bad_request") {
  return NextResponse.json({ error: { message, code } }, { status });
}

export async function readJsonBody(request: Request) {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
