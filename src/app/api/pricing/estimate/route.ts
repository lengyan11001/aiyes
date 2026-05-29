import { authenticateApiKey } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { priceEstimateResponse } from "@/lib/pricing-estimate-request";
import { requireUser } from "@/lib/session";

async function canEstimatePrice(request: Request) {
  const user = await requireUser();
  if (user) return true;
  return Boolean(await authenticateApiKey(request));
}

export async function GET(request: Request) {
  if (!(await canEstimatePrice(request))) {
    return jsonError("请先登录或提供 API Key。", 401, "unauthorized");
  }
  return priceEstimateResponse(request);
}

export async function POST(request: Request) {
  if (!(await canEstimatePrice(request))) {
    return jsonError("请先登录或提供 API Key。", 401, "unauthorized");
  }
  return priceEstimateResponse(request);
}
