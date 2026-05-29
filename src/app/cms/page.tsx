import Link from "next/link";
import { Activity, Clock3, ReceiptText, UsersRound, WalletCards, Zap } from "lucide-react";
import { CmsShell } from "@/components/cms-shell";
import { cmsDate, getCmsStats, jobStatusText, orderStatusText } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { formatPoints, formatYuanFromFen } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CmsDashboardPage() {
  const [stats, recentUsers, recentJobs, recentOrders] = await Promise.all([
    getCmsStats(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, username: true, role: true, status: true, balanceCents: true, createdAt: true },
    }),
    prisma.generationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { username: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { username: true } } },
    }),
  ]);

  return (
    <CmsShell active="dashboard" title="数据面板" subtitle="运营数据、任务和充值状态概览">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<UsersRound />} label="用户总数" value={`${stats.users}`} sub={`活跃 ${stats.activeUsers}`} />
        <Metric icon={<Zap />} label="生成任务" value={`${stats.jobs}`} sub={`今日 ${stats.todayJobs}`} />
        <Metric icon={<Clock3 />} label="处理中任务" value={`${stats.pendingJobs}`} sub="排队与生成中" />
        <Metric icon={<ReceiptText />} label="已支付订单" value={`${stats.paidOrders}`} sub={formatYuanFromFen(stats.paidAmountCents)} />
        <Metric icon={<WalletCards />} label="用户余额池" value={formatPoints(stats.balancePoints)} sub="当前剩余积分" />
        <Metric icon={<Activity />} label="累计消耗" value={formatPoints(stats.usedPoints)} sub="任务扣费合计" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white">
          <CmsSectionHeader title="最近用户" href="/cms/users" />
          <div className="divide-y divide-slate-100">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.username}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.role} / {user.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPoints(user.balanceCents)}</p>
                  <p className="mt-1 text-xs text-slate-500">{cmsDate(user.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <CmsSectionHeader title="最近生成" href="/cms/jobs" />
          <div className="divide-y divide-slate-100">
            {recentJobs.map((job) => (
              <div key={job.id} className="p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{job.user.username}</p>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs">{jobStatusText(job.status)}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-slate-600">{job.prompt}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{job.model}</span>
                  <span>{formatPoints(job.chargedCents)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <CmsSectionHeader title="最近充值" href="/cms/orders" />
          <div className="divide-y divide-slate-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.user.username}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatYuanFromFen(order.amountCents)}</p>
                  <p className="mt-1 text-xs text-slate-500">{orderStatusText(order.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CmsShell>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">{icon}</div>
      </div>
    </div>
  );
}

function CmsSectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h2 className="font-semibold">{title}</h2>
      <Link href={href} className="text-sm text-blue-600">查看</Link>
    </div>
  );
}
