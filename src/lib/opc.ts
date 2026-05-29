import { LedgerType, OrderStatus } from "@prisma/client";
import { ALLOWED_MODELS, MODEL_META } from "@/lib/constants";
import type { ApiKeyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { POINTS_PER_YUAN } from "@/lib/units";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export function parseOpcQuery(request: Request) {
  const url = new URL(request.url);
  const from = parseDate(url.searchParams.get("from"));
  const to = parseDate(url.searchParams.get("to"));
  const page = positiveInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(positiveInt(url.searchParams.get("page_size"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    from,
    to,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function rangeFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

export function pointsToYuan(points: number) {
  return Number((points / POINTS_PER_YUAN).toFixed(2));
}

export function opcSubject(auth: ApiKeyAuth) {
  return {
    subject_id: auth.user.id,
    subject_name: auth.user.name || auth.user.username,
    username: auth.user.username,
    email: auth.user.email,
    role: auth.user.role,
    status: auth.user.status,
    api_key_id: auth.id,
    api_key_prefix: auth.prefix,
  };
}

export function pagination(total: number, page: number, pageSize: number) {
  return {
    page,
    page_size: pageSize,
    total,
    has_more: page * pageSize < total,
  };
}

export async function getOpcAssets(auth: ApiKeyAuth) {
  const [jobCount, completedJobs, apiKeyCount, orders, ledgerCount] = await Promise.all([
    prisma.generationJob.count({ where: { userId: auth.userId } }),
    prisma.generationJob.count({ where: { userId: auth.userId, status: "COMPLETED" } }),
    prisma.apiKey.count({ where: { userId: auth.userId, status: "ACTIVE" } }),
    prisma.order.count({ where: { userId: auth.userId, status: OrderStatus.PAID } }),
    prisma.usageLedger.count({ where: { userId: auth.userId } }),
  ]);

  return {
    balance_points: auth.user.balanceCents,
    balance_yuan: pointsToYuan(auth.user.balanceCents),
    active_api_keys: apiKeyCount,
    generation_jobs: jobCount,
    completed_jobs: completedJobs,
    paid_recharge_orders: orders,
    ledger_records: ledgerCount,
    models: ALLOWED_MODELS.map((id) => ({
      id,
      type: MODEL_META[id].kind.toLowerCase(),
      name: MODEL_META[id].label,
    })),
  };
}

export async function getOpcSummary(auth: ApiKeyAuth, from?: Date, to?: Date) {
  const createdAt = rangeFilter(from, to);
  const paidAt = rangeFilter(from, to);
  const [assets, jobs, completedJobs, failedJobs, usage, recharges, rechargeOrders, firstJob, lastJob] =
    await Promise.all([
      getOpcAssets(auth),
      prisma.generationJob.count({ where: { userId: auth.userId, ...(createdAt ? { createdAt } : {}) } }),
      prisma.generationJob.count({
        where: { userId: auth.userId, status: "COMPLETED", ...(createdAt ? { createdAt } : {}) },
      }),
      prisma.generationJob.count({
        where: { userId: auth.userId, status: "FAILED", ...(createdAt ? { createdAt } : {}) },
      }),
      prisma.usageLedger.aggregate({
        where: { userId: auth.userId, type: LedgerType.DEBIT, ...(createdAt ? { createdAt } : {}) },
        _sum: { amountCents: true },
      }),
      prisma.order.aggregate({
        where: { userId: auth.userId, status: OrderStatus.PAID, ...(paidAt ? { paidAt } : {}) },
        _sum: { amountCents: true, creditsCents: true },
      }),
      prisma.order.count({ where: { userId: auth.userId, status: OrderStatus.PAID, ...(paidAt ? { paidAt } : {}) } }),
      prisma.generationJob.findFirst({
        where: { userId: auth.userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.generationJob.findFirst({
        where: { userId: auth.userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const consumedPoints = Math.abs(usage._sum.amountCents ?? 0);
  const rechargePoints = recharges._sum.creditsCents ?? 0;
  return {
    subject: opcSubject(auth),
    period: {
      from: from?.toISOString() ?? firstJob?.createdAt?.toISOString() ?? null,
      to: to?.toISOString() ?? lastJob?.createdAt?.toISOString() ?? null,
    },
    assets,
    usage: {
      jobs,
      completed_jobs: completedJobs,
      failed_jobs: failedJobs,
      token_consumed_points: consumedPoints,
      token_consumed_yuan: pointsToYuan(consumedPoints),
    },
    recharge: {
      paid_orders: rechargeOrders,
      recharge_points: rechargePoints,
      recharge_yuan: pointsToYuan(rechargePoints),
      paid_amount_points_unit: recharges._sum.amountCents ?? 0,
      paid_amount_yuan: pointsToYuan(recharges._sum.amountCents ?? 0),
    },
  };
}

export async function listOpcUsage(auth: ApiKeyAuth, query: ReturnType<typeof parseOpcQuery>) {
  const createdAt = rangeFilter(query.from, query.to);
  const where = { userId: auth.userId, ...(createdAt ? { createdAt } : {}) };
  const [total, jobs] = await Promise.all([
    prisma.generationJob.count({ where }),
    prisma.generationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        upstreamTaskId: true,
        kind: true,
        model: true,
        status: true,
        prompt: true,
        chargedCents: true,
        upstreamPrice: true,
        createdAt: true,
        completedAt: true,
      },
    }),
  ]);

  return {
    data: jobs.map((job) => ({
      id: job.id,
      order_no: job.id,
      upstream_task_id: job.upstreamTaskId,
      type: job.kind,
      model: job.model,
      status: job.status,
      prompt: job.prompt,
      token_consumed_points: job.chargedCents,
      token_consumed_yuan: pointsToYuan(job.chargedCents),
      upstream_cost_points: job.upstreamPrice === null ? null : Number(job.upstreamPrice),
      created_at: job.createdAt.toISOString(),
      completed_at: job.completedAt?.toISOString() ?? null,
    })),
    pagination: pagination(total, query.page, query.pageSize),
  };
}

export async function listOpcRecharges(auth: ApiKeyAuth, query: ReturnType<typeof parseOpcQuery>) {
  const createdAt = rangeFilter(query.from, query.to);
  const where = { userId: auth.userId, ...(createdAt ? { createdAt } : {}) };
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
    }),
  ]);

  return {
    data: orders.map((order) => ({
      id: order.id,
      order_no: order.id,
      provider: order.provider,
      status: order.status,
      title: order.title,
      amount_points_unit: order.amountCents,
      amount_yuan: pointsToYuan(order.amountCents),
      credits_points: order.creditsCents,
      credits_yuan: pointsToYuan(order.creditsCents),
      wx_transaction_id: order.wxTransactionId,
      invoice_status: "not_requested",
      created_at: order.createdAt.toISOString(),
      paid_at: order.paidAt?.toISOString() ?? null,
    })),
    pagination: pagination(total, query.page, query.pageSize),
  };
}

export async function listOpcLedger(auth: ApiKeyAuth, query: ReturnType<typeof parseOpcQuery>) {
  const createdAt = rangeFilter(query.from, query.to);
  const where = { userId: auth.userId, ...(createdAt ? { createdAt } : {}) };
  const [total, ledgers] = await Promise.all([
    prisma.usageLedger.count({ where }),
    prisma.usageLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: query.skip,
      take: query.take,
    }),
  ]);

  return {
    data: ledgers.map((ledger) => ({
      id: ledger.id,
      type: ledger.type,
      amount_points: ledger.amountCents,
      amount_yuan: pointsToYuan(Math.abs(ledger.amountCents)),
      balance_after_points: ledger.balanceAfter,
      model: ledger.model,
      job_id: ledger.jobId,
      api_key_id: ledger.apiKeyId,
      note: ledger.note,
      created_at: ledger.createdAt.toISOString(),
    })),
    pagination: pagination(total, query.page, query.pageSize),
  };
}

export async function listOpcInvoices(auth: ApiKeyAuth, query: ReturnType<typeof parseOpcQuery>) {
  const recharges = await listOpcRecharges(auth, query);
  return {
    data: recharges.data.map((order) => ({
      id: `invoice_${order.id}`,
      order_no: order.order_no,
      status: order.invoice_status,
      invoice_amount_yuan: order.amount_yuan,
      invoice_amount_points_unit: order.amount_points_unit,
      title: order.title,
      created_at: order.created_at,
      issued_at: null,
    })),
    pagination: recharges.pagination,
  };
}
