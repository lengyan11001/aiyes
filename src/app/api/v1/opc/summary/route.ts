import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getOpcSummary, parseOpcQuery } from "@/lib/opc";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return jsonError("Invalid API key.", 401, "invalid_api_key");
  const query = parseOpcQuery(request);
  return NextResponse.json(await getOpcSummary(auth, query.from, query.to));
}
