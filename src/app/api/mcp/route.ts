import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { readJsonBody } from "@/lib/http";
import {
  getOpcAssets,
  getOpcSummary,
  listOpcInvoices,
  listOpcLedger,
  listOpcRecharges,
  listOpcUsage,
  parseOpcQuery,
} from "@/lib/opc";

const protocolVersion = "2025-06-18";

const toolInputSchema = {
  type: "object",
  properties: {
    from: {
      type: "string",
      description: "可选，ISO 时间，例如 2026-05-01T00:00:00+08:00",
    },
    to: {
      type: "string",
      description: "可选，ISO 时间，例如 2026-05-31T23:59:59+08:00",
    },
    page: {
      type: "number",
      description: "可选，默认 1",
    },
    page_size: {
      type: "number",
      description: "可选，默认 50，最大 200",
    },
  },
  additionalProperties: false,
};

const tools = [
  {
    name: "opc_summary",
    description: "查询 OPC 核验汇总：主体、资产、时间段、Token/积分消耗、充值汇总。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_assets",
    description: "查询主体资产数量、余额、可用模型、API Key 数量。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_usage",
    description: "查询生成记录和 Token/积分消费记录。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_recharges",
    description: "查询充值记录和支付订单号。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_orders",
    description: "查询订单记录，等同充值记录。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_invoices",
    description: "查询发票状态。当前系统未接入开票，返回 not_requested 占位状态。",
    inputSchema: toolInputSchema,
  },
  {
    name: "opc_ledger",
    description: "查询积分流水，包含充值、扣费、后台调整。",
    inputSchema: toolInputSchema,
  },
];

function rpcResult(id: unknown, result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id, result }, { status });
}

function rpcError(id: unknown, code: number, message: string, status = 400) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });
}

function toolText(data: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: false,
  };
}

function requestFromArguments(request: Request, args: Record<string, unknown>) {
  const url = new URL(request.url);
  for (const key of ["from", "to", "page", "page_size"]) {
    const value = args[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return new Request(url, { headers: request.headers });
}

export async function GET() {
  return NextResponse.json({
    name: "Aiyes MCP",
    endpoint: "/api/mcp",
    transport: "Streamable HTTP JSON-RPC over POST",
    auth: "Authorization: Bearer ak_xxx",
  });
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return rpcError(null, -32700, "Parse error", 400);
  }

  const rpc = body as { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
  if (!rpc.method) return rpcError(rpc.id, -32600, "Invalid Request", 400);
  if (rpc.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }
  if (rpc.method === "initialize") {
    return rpcResult(rpc.id, {
      protocolVersion,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "aiyes-mcp",
        version: "1.0.0",
      },
    });
  }
  if (rpc.method === "ping") return rpcResult(rpc.id, {});

  const auth = await authenticateApiKey(request);
  if (!auth) return rpcError(rpc.id, -32001, "Invalid API key", 401);

  if (rpc.method === "tools/list") {
    return rpcResult(rpc.id, { tools });
  }

  if (rpc.method !== "tools/call") {
    return rpcError(rpc.id, -32601, "Method not found", 404);
  }

  const name = rpc.params?.name;
  const args = rpc.params?.arguments ?? {};
  const scopedRequest = requestFromArguments(request, args);
  const query = parseOpcQuery(scopedRequest);

  if (name === "opc_summary") return rpcResult(rpc.id, toolText(await getOpcSummary(auth, query.from, query.to)));
  if (name === "opc_assets") return rpcResult(rpc.id, toolText(await getOpcAssets(auth)));
  if (name === "opc_usage") return rpcResult(rpc.id, toolText(await listOpcUsage(auth, query)));
  if (name === "opc_recharges" || name === "opc_orders") {
    return rpcResult(rpc.id, toolText(await listOpcRecharges(auth, query)));
  }
  if (name === "opc_invoices") return rpcResult(rpc.id, toolText(await listOpcInvoices(auth, query)));
  if (name === "opc_ledger") return rpcResult(rpc.id, toolText(await listOpcLedger(auth, query)));

  return rpcError(rpc.id, -32602, "Unknown tool", 400);
}
