import { CmsShell } from "@/components/cms-shell";
import { cmsDate, jobStatusText } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { formatPoints } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CmsJobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kind?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status || "";
  const kind = params.kind === "IMAGE" || params.kind === "VIDEO" ? params.kind : "";
  const jobs = await prisma.generationJob.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(kind ? { kind: kind as never } : {}),
      ...(q
        ? {
            OR: [
              { prompt: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
              { upstreamTaskId: { contains: q, mode: "insensitive" } },
              { user: { username: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { user: { select: { username: true } }, apiKey: { select: { prefix: true, last4: true } } },
  });

  return (
    <CmsShell active="jobs" title="生成记录" subtitle="查看图片和视频生成任务、扣费、状态和上游任务号">
      <form className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input name="q" defaultValue={q} className="h-10 w-72 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400" placeholder="搜索用户、提示词、模型或任务号" />
        <select name="kind" defaultValue={kind} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400">
          <option value="">全部类型</option>
          <option value="VIDEO">视频</option>
          <option value="IMAGE">图片</option>
        </select>
        <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400">
          <option value="">全部状态</option>
          <option value="PENDING">排队中</option>
          <option value="PROCESSING">处理中</option>
          <option value="COMPLETED">已完成</option>
          <option value="FAILED">失败</option>
          <option value="CANCELED">已取消</option>
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" type="submit">筛选</button>
        <a className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600" href="/cms/jobs">重置</a>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">用户</th>
                <th className="p-3">类型/模型</th>
                <th className="p-3">提示词</th>
                <th className="p-3">状态</th>
                <th className="p-3">扣费</th>
                <th className="p-3">任务号</th>
                <th className="p-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={7}>暂无生成记录</td></tr>}
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <p className="font-medium">{job.user.username}</p>
                    <p className="mt-1 text-xs text-slate-500">{job.apiKey ? `${job.apiKey.prefix}****${job.apiKey.last4}` : "网页登录"}</p>
                  </td>
                  <td className="p-3">
                    <p>{job.kind === "VIDEO" ? "视频" : "图片"}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{job.model}</p>
                  </td>
                  <td className="max-w-md p-3">
                    <p className="line-clamp-2">{job.prompt}</p>
                    {job.error && <p className="mt-2 line-clamp-2 text-xs text-rose-600">{job.error}</p>}
                  </td>
                  <td className="p-3">{jobStatusText(job.status)}</td>
                  <td className="p-3 font-medium">{formatPoints(job.chargedCents)}</td>
                  <td className="p-3 font-mono text-xs text-slate-500">{job.upstreamTaskId || job.id}</td>
                  <td className="p-3 text-xs text-slate-500">
                    <p>创建 {cmsDate(job.createdAt)}</p>
                    <p className="mt-1">完成 {cmsDate(job.completedAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CmsShell>
  );
}
