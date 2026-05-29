import { NextResponse } from "next/server";
import { z } from "zod";
import { creditUser } from "@/lib/billing";
import { jsonError, readJsonBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  amountCents: z.number().int().min(1).max(10000000),
  note: z.string().max(120).default("admin adjustment"),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("需要管理员权限。", 403, "forbidden");
  const parsed = schema.safeParse(await readJsonBody(request));
  if (!parsed.success) return jsonError("参数错误。", 422, "validation_error");
  const { id } = await context.params;
  const user = await creditUser({ userId: id, amountCents: parsed.data.amountCents, note: parsed.data.note });
  return NextResponse.json({ user });
}
