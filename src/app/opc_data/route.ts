import { NextResponse } from "next/server";
import { getOpcData, isValidOpcDataKey, parseOpcDataRequest } from "@/lib/opc-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isValidOpcDataKey(request)) {
    return NextResponse.json({ error: "无权限" }, { status: 401 });
  }

  try {
    const parsed = await parseOpcDataRequest(request);
    if ("error" in parsed) {
      return NextResponse.json({}, { status: 404 });
    }

    return NextResponse.json(await getOpcData(parsed.opcList, parsed.from, parsed.to, parsed.startDate, parsed.endDate));
  } catch (error) {
    console.error("opc_data failed", error);
    return NextResponse.json({}, { status: 404 });
  }
}
