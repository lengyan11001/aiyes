import { JobKind, OrderStatus, type ApiKey, type GenerationJob, type User } from "@prisma/client";
import { isAllowedModel, MODEL_META } from "@/lib/constants";
import { sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { pointsToYuan } from "@/lib/opc";
import { normalizeVideoDuration } from "@/lib/pricing";

type OpcListItem =
  | string
  | {
      name?: unknown;
      opcName?: unknown;
      subjectName?: unknown;
      subject_name?: unknown;
      userName?: unknown;
      user_name?: unknown;
      username?: unknown;
      token?: unknown;
      tokenList?: unknown;
      apiKey?: unknown;
      apiKeys?: unknown;
      tokens?: unknown;
    };

type NormalizedOpcSubject = {
  raw: string;
  name?: string;
  username?: string;
  tokens: string[];
};

type OpcDataDate = {
  date: Date;
  label: string;
};

type UserWithKeys = User & { apiKeys: ApiKey[] };

type OpcDataSubjectResponse = {
  recharge: Array<{
    amount: number;
    time: string;
    invoice_url: string;
    order_id: string;
  }>;
  consume: Array<{
    name: string;
    type: string;
    result: string;
    cost: number;
    time: string;
  }>;
  production: {
    image_num: number;
    audio_num: number;
    audio_duration: number;
    video_num: number;
    video_duration: number;
  };
};

const MAX_OPC_SUBJECTS = 100;
const OPC_DATA_CONCURRENCY = 5;

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    if (text.startsWith("[") && text.endsWith("]")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return stringArray(parsed);
      } catch {
        // Fall through to comma splitting for form-data values like [a,b].
      }
      return text
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseOpcList(value: unknown): OpcListItem[] {
  if (Array.isArray(value)) return value as OpcListItem[];
  if (typeof value !== "string" || !value.trim()) return [];
  const text = value.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed as OpcListItem[];
    } catch {
      return text
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
  }
  return stringArray(text);
}

function normalizeOpcItem(item: OpcListItem): NormalizedOpcSubject | null {
  if (typeof item === "string") {
    const value = item.trim();
    if (!value) return null;
    return {
      raw: value,
      name: value,
      username: value,
      tokens: [value],
    };
  }

  if (!item || typeof item !== "object") return null;
  const name = firstString(item.name, item.opcName, item.subjectName, item.subject_name);
  const username = firstString(item.username, item.userName, item.user_name);
  const tokens = [
    ...stringArray(item.token),
    ...stringArray(item.tokenList),
    ...stringArray(item.apiKey),
    ...stringArray(item.apiKeys),
    ...stringArray(item.tokens),
  ];
  const raw = name || username || tokens[0];
  return raw ? { raw, name, username, tokens } : null;
}

function parseDateOnly(value: unknown, endOfDay = false): OpcDataDate | undefined | null {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const text = value.trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const dateText = isDateOnly ? `${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00` : text;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  return { date, label: isDateOnly ? text : date.toISOString().slice(0, 10) };
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function modelName(model: string) {
  return MODEL_META[model]?.label || MODEL_META[model]?.shortLabel || model;
}

function modelType(job: Pick<GenerationJob, "kind" | "model">) {
  if (job.kind === JobKind.IMAGE) return "图片生成";
  if (job.kind === JobKind.VIDEO) return "视频生成";
  return "生成";
}

function videoSeconds(job: Pick<GenerationJob, "kind" | "model" | "params">) {
  if (job.kind !== JobKind.VIDEO) return 0;
  const params = jsonObject(job.params);
  const rawDuration = params.duration as string | number | null | undefined;
  const duration = isAllowedModel(job.model) ? normalizeVideoDuration(rawDuration, job.model) : rawDuration;
  const seconds = Number(String(duration ?? "").match(/\d+/)?.[0] ?? 0);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function jobResultText(job: Pick<GenerationJob, "kind" | "model" | "params">) {
  if (job.kind === JobKind.IMAGE) return "图片1张";
  const seconds = videoSeconds(job);
  return seconds > 0 ? `视频${seconds}秒` : "视频";
}

function emptySubjectData(): OpcDataSubjectResponse {
  return {
    recharge: [],
    consume: [],
    production: {
      image_num: 0,
      audio_num: 0,
      audio_duration: 0,
      video_num: 0,
      video_duration: 0,
    },
  };
}

export function expectedOpcDataKey() {
  return env.OPC_DATA_HEADER_KEY?.trim() || "";
}

export function isValidOpcDataKey(request: Request) {
  const expected = expectedOpcDataKey();
  return Boolean(expected) && request.headers.get("key")?.trim() === expected;
}

export async function parseOpcDataRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let rawOpcList: unknown;
  let startDate: unknown;
  let endDate: unknown;

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const all = form.getAll("opcList");
    const single = form.get("opcList");
    rawOpcList = all.length > 1 ? all.map((item) => String(item)) : single ? String(single) : undefined;
    startDate = form.get("startDate");
    endDate = form.get("endDate");
  } else {
    const text = await request.text();
    let body: Record<string, unknown>;
    try {
      body = text.trim() ? JSON.parse(text) : {};
    } catch {
      return { error: "请求体不是合法 JSON。", status: 400 as const };
    }
    rawOpcList = body.opcList;
    startDate = body.startDate;
    endDate = body.endDate;
  }

  const inputList = parseOpcList(rawOpcList);
  const opcList = inputList.map((item) => normalizeOpcItem(item as OpcListItem)).filter((item): item is NormalizedOpcSubject => Boolean(item));
  const fromInput = parseDateOnly(startDate, false);
  const toInput = parseDateOnly(endDate, true);

  if (fromInput === null || toInput === null) {
    return { error: "startDate 或 endDate 格式不正确，请使用 YYYY-MM-DD 或 ISO 时间。", status: 400 as const };
  }
  if (opcList.length === 0) {
    return { error: "opcList 不能为空。", status: 400 as const };
  }
  if (opcList.length > MAX_OPC_SUBJECTS) {
    return { error: `opcList 最多支持 ${MAX_OPC_SUBJECTS} 个主体。`, status: 400 as const };
  }

  return { opcList, from: fromInput?.date, to: toInput?.date, startDate: fromInput?.label ?? null, endDate: toInput?.label ?? null };
}

async function findUser(subject: NormalizedOpcSubject): Promise<UserWithKeys | null> {
  const tokenHashes = [...new Set(subject.tokens)].map((token) => sha256(token));
  if (tokenHashes.length > 0) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash: { in: tokenHashes }, status: "ACTIVE" },
      include: { user: { include: { apiKeys: true } } },
    });
    if (apiKey?.user.status === "ACTIVE") return apiKey.user;
  }

  const names = [...new Set([subject.username, subject.name, subject.raw].filter((value): value is string => Boolean(value)))];
  if (names.length === 0) return null;

  return prisma.user.findFirst({
    where: {
      status: "ACTIVE",
      OR: names.flatMap((value) => [
        { username: { equals: value, mode: "insensitive" as const } },
        { email: { equals: value, mode: "insensitive" as const } },
        { name: { equals: value, mode: "insensitive" as const } },
      ]),
    },
    include: { apiKeys: true },
  });
}

async function buildSubjectData(
  subject: NormalizedOpcSubject,
  user: UserWithKeys | null,
  from?: Date,
  to?: Date,
): Promise<[string, OpcDataSubjectResponse]> {
  const subjectName = subject.name || subject.username || subject.raw;
  if (!user) return [subjectName, emptySubjectData()];

  const createdAt = dateRange(from, to);
  const paidAt = dateRange(from, to);
  const orderWhere = { userId: user.id, status: OrderStatus.PAID, ...(paidAt ? { paidAt } : {}) };
  const jobWhere = { userId: user.id, ...(createdAt ? { createdAt } : {}) };

  const [orders, consumeJobs, allJobs] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { paidAt: "asc" },
      select: { id: true, amountCents: true, paidAt: true, createdAt: true },
    }),
    prisma.generationJob.findMany({
      where: { ...jobWhere, status: "COMPLETED", chargedCents: { gt: 0 } },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, model: true, params: true, chargedCents: true, completedAt: true, createdAt: true },
    }),
    prisma.generationJob.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: { kind: true, model: true, params: true },
    }),
  ]);

  const production = allJobs.reduce(
    (sum, job) => {
      if (job.kind === JobKind.IMAGE) sum.image_num += 1;
      if (job.kind === JobKind.VIDEO) {
        sum.video_num += 1;
        sum.video_duration += videoSeconds(job);
      }
      return sum;
    },
    emptySubjectData().production,
  );

  return [
    subjectName,
    {
      recharge: orders.map((order) => ({
        amount: pointsToYuan(order.amountCents),
        time: (order.paidAt || order.createdAt).toISOString(),
        invoice_url: "",
        order_id: order.id,
      })),
      consume: consumeJobs.map((job) => ({
        name: modelName(job.model),
        type: modelType(job),
        result: jobResultText(job),
        cost: pointsToYuan(job.chargedCents),
        time: (job.completedAt || job.createdAt).toISOString(),
      })),
      production,
    },
  ];
}

export async function getOpcData(
  opcList: NormalizedOpcSubject[],
  from?: Date,
  to?: Date,
  startDate: string | null = null,
  endDate: string | null = null,
) {
  const entries: Array<[string, OpcDataSubjectResponse]> = [];
  for (let index = 0; index < opcList.length; index += OPC_DATA_CONCURRENCY) {
    const chunk = opcList.slice(index, index + OPC_DATA_CONCURRENCY);
    entries.push(
      ...(await Promise.all(
        chunk.map(async (subject) => buildSubjectData(subject, await findUser(subject), from, to)),
      )),
    );
  }

  return Object.fromEntries(entries);
}
