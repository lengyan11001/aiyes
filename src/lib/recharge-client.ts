"use client";

import { RECHARGE_TIERS_POINTS } from "@/lib/units";

export const DEFAULT_RECHARGE_AMOUNT_CENTS = RECHARGE_TIERS_POINTS[0];

export interface RechargePaymentStart {
  /** pay.5vips.com cashier page; set whenever Stripe is configured. */
  checkoutUrl: string | null;
  /** WeChat native QR payload, only used when Stripe is not configured. */
  codeUrl: string | null;
  warning: string | null;
}

export async function startRecharge(amountCents: number): Promise<RechargePaymentStart> {
  const response = await fetch("/api/billing/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "创建订单失败");
  }
  return {
    checkoutUrl: typeof payload?.payment?.checkoutUrl === "string" ? payload.payment.checkoutUrl : null,
    codeUrl: typeof payload?.payment?.codeUrl === "string" ? payload.payment.codeUrl : null,
    warning: typeof payload?.warning === "string" ? payload.warning : null,
  };
}

/**
 * Creates the top-up order and leaves the SPA immediately: the pay.5vips.com
 * cashier when Stripe is configured, otherwise the recharge page that renders
 * the WeChat QR / warning.
 */
export async function goToCashier(amountCents = DEFAULT_RECHARGE_AMOUNT_CENTS) {
  const payment = await startRecharge(amountCents);
  if (payment.checkoutUrl) {
    window.location.assign(payment.checkoutUrl);
    return payment;
  }
  window.location.assign("/recharge");
  return payment;
}
