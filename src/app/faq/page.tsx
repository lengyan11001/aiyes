import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const faqs = [
  {
    q: "用户如何接入？",
    a: "模型接口使用 Authorization: Bearer ak_xxx 调用。登录后可在 API Key 页面创建和管理自己的调用 Key。",
  },
  {
    q: "页面生成和 API 是同一套记录吗？",
    a: "是。页面发起的任务、API 发起的任务、扣费流水、充值流水都会进入同一套任务记录和账户流水。",
  },
  {
    q: "平台 Key 如何管理？",
    a: "登录后可在头像菜单进入 API Key 页面创建子 Key，创建后会直接出现在列表中，可复制、设置积分额度和调用次数，也可以修改或删除。",
  },
  {
    q: "充值后积分怎么计算？",
    a: "充值按 1 元人民币等于 100 积分入账，生成任务按当前售卖价扣减积分。",
  },
];

export default async function FaqPage() {
  const user = await requireUser();
  const menuUser = user
    ? {
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        balanceCents: user.balanceCents,
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={menuUser} />
      <section className="border-b border-white/10 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-slate-400">FAQ</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">常见问题</h1>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-4">
          {faqs.map((item) => (
            <article key={item.q} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <h2 className="font-semibold">{item.q}</h2>
              <p className="mt-2 leading-7 text-slate-300">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
