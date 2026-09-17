import type { Order } from "@prisma/client";
import { markOrderPaid } from "./billing";
import { env, stripeEnv } from "./env";

/**
 * Every Checkout Session created by this site carries this tag, so a session
 * that belongs to another product on the shared Stripe account can never be
 * used to credit an aiyes order.
 */
export const STRIPE_CHECKOUT_SOURCE = "aiyes-5vips";

export interface StripeCheckoutSession {
  id: string;
  object?: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  payment_intent?: string | { id?: string | null } | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string> | null;
  created?: number | null;
  expires_at?: number | null;
}

export interface StripeOrderStoredFields {
  sessionId?: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  paymentStatus?: string;
  amountTotal?: number;
  currency?: string;
  customerEmail?: string;
  storedAt?: string;
}

export function stripeConfigured() {
  return Boolean(stripeEnv.secretKey);
}

function stripeForm(params: Record<string, string | number | undefined | null>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    form.set(key, String(value));
  }
  return form;
}

async function stripeRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: URLSearchParams; timeoutMs?: number } = {},
): Promise<T> {
  if (!stripeEnv.secretKey) throw new Error("Stripe 未配置。");
  const method = init.method ?? "POST";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  try {
    const response = await fetch(`${stripeEnv.apiBaseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${stripeEnv.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: method === "GET" ? undefined : init.body,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = payload?.error?.message || `Stripe 请求失败：HTTP ${response.status}`;
      throw new Error(String(message));
    }
    return payload as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Public cashier page on the pay.5vips.com host, matching the 123vips flow. */
export function stripeCashierUrl(sessionId: string) {
  const path = stripeEnv.cashierPath.endsWith("/") ? stripeEnv.cashierPath : `${stripeEnv.cashierPath}/`;
  return `${stripeEnv.cashierBaseUrl}${path}?sid=${encodeURIComponent(sessionId)}`;
}

export function storedStripeFields(raw: unknown): StripeOrderStoredFields | null {
  if (!raw || typeof raw !== "object") return null;
  const stripe = (raw as { stripe?: unknown }).stripe;
  if (!stripe || typeof stripe !== "object") return null;
  return stripe as StripeOrderStoredFields;
}

/** The session id lives in `raw.stripe.sessionId` and is mirrored to `wxPrepayId`. */
export function stripeSessionIdForOrder(order: { raw?: unknown; wxPrepayId?: string | null }) {
  const stored = storedStripeFields(order.raw);
  if (stored?.sessionId) return stored.sessionId;
  const prepay = typeof order.wxPrepayId === "string" ? order.wxPrepayId.trim() : "";
  return prepay.startsWith("cs_") ? prepay : null;
}

function stripePaymentIntentId(session: StripeCheckoutSession) {
  const value = session.payment_intent;
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

export function stripeRawForSession(session: StripeCheckoutSession): Record<string, unknown> {
  return {
    stripe: {
      sessionId: session.id,
      checkoutUrl: session.url ?? "",
      paymentIntentId: stripePaymentIntentId(session) ?? "",
      paymentStatus: session.payment_status ?? "",
      amountTotal: session.amount_total ?? 0,
      currency: session.currency ?? stripeEnv.currency,
      customerEmail: session.customer_details?.email ?? "",
      storedAt: new Date().toISOString(),
    } satisfies StripeOrderStoredFields,
  };
}

export async function createStripeRechargeSession({
  orderId,
  userId,
  description,
  amountCents,
}: {
  orderId: string;
  userId: string;
  description: string;
  amountCents: number;
}) {
  const origin = env.APP_URL.replace(/\/+$/, "");
  return stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", {
    body: stripeForm({
      mode: "payment",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": stripeEnv.currency,
      "line_items[0][price_data][unit_amount]": amountCents,
      "line_items[0][price_data][product_data][name]": description.slice(0, 120),
      client_reference_id: orderId,
      "metadata[order_id]": orderId,
      "metadata[user_id]": userId,
      "metadata[source]": STRIPE_CHECKOUT_SOURCE,
      "payment_intent_data[metadata][order_id]": orderId,
      "payment_intent_data[metadata][source]": STRIPE_CHECKOUT_SOURCE,
      success_url: `${origin}/recharge?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/recharge?stripe_status=cancelled`,
    }),
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(
    `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET", timeoutMs: 15_000 },
  );
}

export interface StripeReconcileResult {
  order: Order;
  session: StripeCheckoutSession | null;
  credited: boolean;
  reason?: string;
}

/**
 * Credit a pending Stripe order when the shared Stripe account reports it paid.
 * Every check is defensive: wrong order, wrong source tag, unpaid session or a
 * mismatched amount all leave the order untouched so it can be retried later.
 */
export async function reconcileStripeOrder(
  order: Order,
  options: { session?: StripeCheckoutSession } = {},
): Promise<StripeReconcileResult> {
  if (order.provider !== "stripe") return { order, session: null, credited: false, reason: "provider_mismatch" };
  if (order.status === "PAID") return { order, session: null, credited: false, reason: "already_paid" };
  if (order.status !== "PENDING") return { order, session: null, credited: false, reason: "not_pending" };

  const sessionId = stripeSessionIdForOrder(order);
  if (!sessionId) return { order, session: null, credited: false, reason: "missing_session" };

  const session = options.session ?? (await retrieveStripeCheckoutSession(sessionId));
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  if (metadata.source !== STRIPE_CHECKOUT_SOURCE || (metadata.order_id && metadata.order_id !== order.id)) {
    return { order, session, credited: false, reason: "metadata_mismatch" };
  }
  if (session.payment_status !== "paid") {
    return {
      order,
      session,
      credited: false,
      reason: `payment_status:${session.payment_status || session.status || "unpaid"}`,
    };
  }

  const paidAmountCents = Number(session.amount_total ?? 0);
  if (paidAmountCents !== order.amountCents) {
    return { order, session, credited: false, reason: "amount_mismatch" };
  }

  const paidOrder = await markOrderPaid({
    orderId: order.id,
    paidAmountCents,
    transactionId: stripePaymentIntentId(session),
    raw: stripeRawForSession(session) as never,
  });

  return { order: paidOrder, session, credited: paidOrder.status === "PAID" };
}
