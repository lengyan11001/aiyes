import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

function publicUrl(request: Request, path: string) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return new URL(path, `${proto}://${host}`);
}

export async function GET(request: Request) {
  const user = await requireUser();

  if (user) {
    return NextResponse.redirect(publicUrl(request, "/generate"));
  }

  const login = publicUrl(request, "/login");
  login.searchParams.set("tab", "register");
  login.searchParams.set("next", "/generate");
  return NextResponse.redirect(login);
}
