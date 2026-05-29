import { env } from "./env";

export interface ApizCreateResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  channel?: string;
  model?: string;
  price?: number;
  created_at?: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
}

export interface ApizQueryResponse extends ApizCreateResponse {
  progress?: number;
}

async function requestApiz<T>(path: string, body: unknown, timeoutMs = env.APIZ_TIMEOUT_MS): Promise<T> {
  if (!env.APIZ_API_KEY) {
    throw new Error("Generation provider is not configured.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${env.APIZ_BASE_URL.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.APIZ_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message =
        payload?.message || payload?.detail || `generation provider returned HTTP ${res.status}`;
      throw new Error(message);
    }
    return payload?.data ?? payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function createApizTask(model: string, params: Record<string, unknown>) {
  return requestApiz<ApizCreateResponse>("/api/v3/tasks/create", {
    model,
    params,
    channel: "api",
  });
}

export async function queryApizTask(taskId: string) {
  return requestApiz<ApizQueryResponse>("/api/v3/tasks/query", { task_id: taskId });
}

export async function waitApizTask(taskId: string, timeoutMs = env.APIZ_SYNC_WAIT_MS) {
  const start = Date.now();
  let last: ApizQueryResponse | null = null;
  while (Date.now() - start < timeoutMs) {
    last = await queryApizTask(taskId);
    if (last.status === "completed" || last.status === "failed") return last;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return last;
}
