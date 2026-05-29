import { CmsCreditAction, CmsPasswordAction, CmsStatusAction } from "@/components/cms-user-actions";
import { CmsShell } from "@/components/cms-shell";
import { cmsDate } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { formatPoints } from "@/lib/units";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CmsUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status === "DISABLED" ? "DISABLED" : params.status === "ACTIVE" ? "ACTIVE" : "";
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "DISABLED" } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: {
        select: { jobs: true, orders: true, apiKeys: true },
      },
    },
  });

  return (
    <CmsShell active="users" title="用户管理" subtitle="查询用户、增加积分、修改密码和启停账号">
      <form className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          name="q"
          defaultValue={q}
          className="h-10 w-64 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
          placeholder="搜索账号、姓名或邮箱"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-blue-400"
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">启用</option>
          <option value="DISABLED">禁用</option>
        </select>
        <button className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white" type="submit">筛选</button>
        <a className="h-10 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600" href="/cms/users">重置</a>
      </form>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1160px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">账号</th>
                <th className="p-3">角色/状态</th>
                <th className="p-3">积分余额</th>
                <th className="p-3">统计</th>
                <th className="p-3">登录/注册</th>
                <th className="p-3">增加积分</th>
                <th className="p-3">修改密码</th>
                <th className="p-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td className="p-4 text-slate-500" colSpan={8}>暂无用户</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 align-top">
                  <td className="p-3">
                    <p className="font-medium">{user.username}</p>
                    <p className="mt-1 text-xs text-slate-500">{user.name || user.email || user.id}</p>
                  </td>
                  <td className="p-3">
                    <p>{user.role}</p>
                    <span className={`mt-2 inline-flex rounded px-2 py-1 text-xs ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {user.status === "ACTIVE" ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{formatPoints(user.balanceCents)}</td>
                  <td className="p-3 text-slate-600">
                    <p>任务 {user._count.jobs}</p>
                    <p>订单 {user._count.orders}</p>
                    <p>Key {user._count.apiKeys}</p>
                  </td>
                  <td className="p-3 text-xs text-slate-500">
                    <p>注册 {cmsDate(user.createdAt)}</p>
                    <p className="mt-1">登录 {cmsDate(user.lastLoginAt)}</p>
                  </td>
                  <td className="p-3"><CmsCreditAction userId={user.id} /></td>
                  <td className="p-3"><CmsPasswordAction userId={user.id} /></td>
                  <td className="p-3"><CmsStatusAction userId={user.id} status={user.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CmsShell>
  );
}
