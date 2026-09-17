"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, X } from "lucide-react";
import { goToCashier } from "@/lib/recharge-client";
import { formatPoints, formatYuanFromFen, RECHARGE_TIERS_POINTS } from "@/lib/units";

/**
 * Tier picker only: picking an amount creates the order and leaves for the
 * pay.5vips.com cashier. No QR code, no order panel.
 */
export function RechargeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [startingAmount, setStartingAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const pickAmount = useCallback(
    async (amountCents: number) => {
      if (startingAmount !== null) return;
      setStartingAmount(amountCents);
      try {
        await goToCashier(amountCents);
      } catch {
        window.location.assign("/recharge");
      } finally {
        setStartingAmount(null);
      }
    },
    [startingAmount],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择充值金额"
        className="w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">选择充值金额</h2>
            <p className="mt-1 text-sm text-slate-400">选定后跳转到 pay.5vips.com 安全收银台完成支付。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5">
          {RECHARGE_TIERS_POINTS.map((amountCents) => {
            const busy = startingAmount === amountCents;
            const disabled = startingAmount !== null;
            return (
              <button
                key={amountCents}
                type="button"
                onClick={() => void pickAmount(amountCents)}
                disabled={disabled}
                className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-left hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <span className="block text-base font-medium">{formatYuanFromFen(amountCents)}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">到账 {formatPoints(amountCents)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {busy ? "跳转中" : "去支付"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-500">
          按 1 元 = 100 积分入账，支付完成后余额自动更新。
        </p>
      </div>
    </div>
  );
}
