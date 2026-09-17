"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, QrCode, RefreshCw, WalletCards } from "lucide-react";
import QRCode from "qrcode";
import { formatPoints, formatYuanFromFen, RECHARGE_TIERS_POINTS } from "@/lib/units";

type OrderStatus = "PENDING" | "PAID" | "CLOSED" | "REFUNDED" | "FAILED";

interface RechargeOrder {
  id: string;
  provider?: string;
  status: OrderStatus;
  amountCents: number;
  creditsCents: number;
  createdAt: string;
  paidAt?: string | null;
}

interface OrderPayment {
  provider?: string;
  codeUrl?: string | null;
  /** pay.5vips.com cashier page for this session. */
  checkoutUrl?: string | null;
  sessionId?: string | null;
}

export function RechargePanel({ compact = false }: { compact?: boolean }) {
  const [amountCents, setAmountCents] = useState(RECHARGE_TIERS_POINTS[0]);
  const [order, setOrder] = useState<RechargeOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const autoCreatedRef = useRef(false);

  const quickAmounts = useMemo(() => RECHARGE_TIERS_POINTS, []);

  const createOrder = useCallback(async (nextAmountCents = amountCents) => {
    setLoading(true);
    setMessage("");
    setOrder(null);
    setQrDataUrl("");
    try {
      const res = await fetch("/api/billing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: nextAmountCents }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "创建订单失败");
      const payment: OrderPayment | null = payload.payment ?? null;
      setOrder(payload.order);
      if (payment?.checkoutUrl) {
        setMessage("正在跳转到 pay.5vips.com 完成支付…");
        window.location.assign(payment.checkoutUrl);
        return;
      }
      if (payment?.codeUrl) {
        setQrDataUrl(await QRCode.toDataURL(payment.codeUrl, { width: 220, margin: 1 }));
        return;
      }
      setMessage(payload.warning || "支付暂未可用，请联系管理员。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建订单失败");
    } finally {
      setLoading(false);
    }
  }, [amountCents]);

  const checkOrder = useCallback(async () => {
    if (!order) return;
    setChecking(true);
    setMessage("");
    try {
      const res = await fetch(`/api/billing/orders/${order.id}/query`, { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message || "查询订单失败");
      setOrder(payload.order);
      if (payload.order?.status === "PAID") {
        setMessage("充值已到账，余额和流水已更新。");
      } else if (payload.trade?.trade_state_desc) {
        setMessage(payload.trade.trade_state_desc);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "查询订单失败");
    } finally {
      setChecking(false);
    }
  }, [order]);

  useEffect(() => {
    if (!order || order.status === "PAID") return;
    const timer = window.setInterval(() => {
      void checkOrder();
    }, 3500);
    return () => window.clearInterval(timer);
  }, [checkOrder, order]);

  // Coming back from the pay.5vips.com cashier: pick the pending order back up
  // and let the server confirm it against Stripe (the list call also credits it).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/orders", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        const orders: RechargeOrder[] = Array.isArray(payload?.orders) ? payload.orders : [];
        const pending = orders.find((item) => item.status === "PENDING" && item.provider === "stripe");
        if (cancelled || !pending) return;
        setOrder(pending);
        setAmountCents(pending.amountCents);
        setMessage("正在确认支付结果…");
      } catch {
        // Ignore: the user can press 查询到账 manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!compact || autoCreatedRef.current) return;
    autoCreatedRef.current = true;
    void createOrder(RECHARGE_TIERS_POINTS[0]);
  }, [compact, createOrder]);

  return (
    <div className={compact ? "" : "rounded-lg border border-white/10 bg-slate-950 p-5 text-white"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          {!compact && <h2 className="text-xl font-semibold">账户充值</h2>}
          <p className={compact ? "text-sm text-slate-400" : "mt-1 text-sm text-slate-400"}>
            微信扫码支付后自动入账，按 1 元 = 100 积分记账。
          </p>
        </div>
        <WalletCards className="h-5 w-5 text-slate-300" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              setAmountCents(amount);
              if (compact) void createOrder(amount);
            }}
            disabled={loading}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              amountCents === amount
                ? "border-white bg-white text-slate-950"
                : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
            }`}
          >
            {formatYuanFromFen(amount)}
          </button>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <span className="text-sm text-slate-400">到账 {formatPoints(amountCents)}</span>
          <button
            type="button"
            onClick={() => createOrder()}
            disabled={loading || amountCents < 100}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            去支付
          </button>
        </div>
      )}

      {compact && (
        <div className="mt-4 rounded-md bg-white/[0.04] px-3 py-2 text-sm text-slate-400">
          选择档位后会跳转到 pay.5vips.com 完成支付，当前到账 {formatPoints(amountCents)}。
        </div>
      )}

      {order && (
        <div className="mt-5 grid gap-4 rounded-md border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[240px_1fr]">
          <div className="flex h-60 items-center justify-center rounded-md bg-white">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="微信支付二维码" className="h-[220px] w-[220px]" src={qrDataUrl} />
            ) : order.provider === "stripe" ? (
              <div className="px-6 text-center text-slate-600">
                <CreditCard className="mx-auto h-10 w-10" />
                <p className="mt-3 text-sm">
                  {order.status === "PAID" ? "支付已完成" : "已跳转到 pay.5vips.com 收银台"}
                </p>
              </div>
            ) : (
              <QrCode className="h-10 w-10 text-slate-300" />
            )}
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-sm text-slate-400">订单号</p>
              <p className="mt-1 break-all font-mono text-sm">{order.id}</p>
              <p className="mt-4 text-sm text-slate-400">支付金额</p>
              <p className="text-2xl font-semibold">{formatYuanFromFen(order.amountCents)}</p>
              <p className="mt-1 text-sm text-slate-400">到账 {formatPoints(order.creditsCents)}</p>
              <p className="mt-4 text-sm text-slate-400">状态</p>
              <p className="mt-1 inline-flex items-center gap-2 rounded bg-white px-2 py-1 text-sm text-slate-950">
                {order.status === "PAID" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {order.status}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={checkOrder}
                disabled={checking}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed"
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                查询到账
              </button>
              {order.provider === "stripe" && order.status !== "PAID" && (
                <button
                  type="button"
                  onClick={() => createOrder(order.amountCents)}
                  disabled={loading}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  重新打开支付页
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
    </div>
  );
}
