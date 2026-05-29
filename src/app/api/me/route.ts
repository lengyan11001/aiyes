import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json({ user });
}
