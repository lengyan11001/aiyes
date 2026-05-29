import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { getOpcAssets, opcSubject } from "@/lib/opc";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return jsonError("Invalid API key.", 401, "invalid_api_key");
  return NextResponse.json({
    subject: opcSubject(auth),
    assets: await getOpcAssets(auth),
  });
}
