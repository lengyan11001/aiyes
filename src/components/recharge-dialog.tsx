"use client";

import { X } from "lucide-react";
import { RechargePanel } from "@/components/recharge-panel";

export function RechargeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">账户充值</h2>
            <p className="mt-1 text-sm text-slate-400">选择档位后生成微信支付二维码。</p>
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
        <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-5">
          <RechargePanel compact />
        </div>
      </div>
    </div>
  );
}
