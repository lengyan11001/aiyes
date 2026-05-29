import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host === "cms.aiyes.vip" && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/cms", `https://${host}`));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
