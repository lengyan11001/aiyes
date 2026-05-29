import { authenticateApiKey } from "@/lib/api-auth";
import { jsonError } from "@/lib/http";
import { priceEstimateResponse } from "@/lib/pricing-estimate-request";

async function requireApiKey(request: Request) {
  const apiKey = await authenticateApiKey(request);
  if (!apiKey) return false;
  return true;
}

export async function GET(request: Request) {
  if (!(await requireApiKey(request))) {
    return jsonError("Invalid API key.", 401, "invalid_api_key");
  }
  return priceEstimateResponse(request);
}

export async function POST(request: Request) {
  if (!(await requireApiKey(request))) {
    return jsonError("Invalid API key.", 401, "invalid_api_key");
  }
  return priceEstimateResponse(request);
}
