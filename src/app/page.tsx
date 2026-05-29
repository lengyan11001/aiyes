import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Blocks,
  Braces,
  Clock3,
  Image as ImageIcon,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Video,
  WalletCards,
  Zap,
} from "lucide-react";
import { HeroPreviewVideo, HoverVideoCard, type CaseStudy } from "@/components/home-media";
import { LegalFooter } from "@/components/legal-footer";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const caseStudies: CaseStudy[] = [
  {
    title: "机器人动画预览",
    tag: "视频生成",
    media: "video",
    src: "/hero/aiyes-preview-robot.mp4",
    poster: "/hero/aiyes-preview-robot.jpg",
    desc: "从一句描述生成连续镜头，适合助手内直接返回视频结果。",
  },
  {
    title: "科幻镜头生成",
    tag: "视频生成",
    media: "video",
    src: "/hero/aiyes-preview-sci-fi.mp4",
    poster: "/hero/aiyes-preview-sci-fi.jpg",
    desc: "复杂场景、镜头运动和氛围变化可作为任务结果落库。",
  },
  {
    title: "城市短片生成",
    tag: "视频生成",
    media: "video",
    src: "/hero/aiyes-preview-era-walk.mp4",
    poster: "/hero/aiyes-preview-era-walk.jpg",
    desc: "适合做短片、动态封面和 AI 助手的多媒体回复。",
  },
  {
    title: "助手能力编排",
    tag: "图像生成",
    media: "image",
    src: "/hero/aiyes-hero-orchestrator-sm.webp",
    desc: "把图像能力包装成工具，接入业务系统或智能体工作流。",
  },
];

const capabilities = [
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "图像生成",
    text: "统一封装提示词、参考图、结果地址和任务记录。",
  },
  {
    icon: <Video className="h-5 w-5" />,
    title: "视频生成",
    text: "支持异步任务，前端可刷新查询，服务端完整落库。",
  },
  {
    icon: <Braces className="h-5 w-5" />,
    title: "API / MCP",
    text: "同一套能力既能给开发者调用，也能给工具平台接入。",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "可审计",
    text: "用户、余额、流水、任务、失败原因都可以追踪。",
  },
];

const flowSteps = [
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: "创建密钥",
    text: "用户注册后生成 API Key，后台可管理状态和额度。",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "发起生成",
    text: "图片和视频模型统一进入任务系统，避免前端长时间等待。",
  },
  {
    icon: <Clock3 className="h-5 w-5" />,
    title: "查询结果",
    text: "任务状态、结果地址、失败信息都通过同一接口返回。",
  },
  {
    icon: <WalletCards className="h-5 w-5" />,
    title: "记录流水",
    text: "充值和消耗进入同一流水账，便于用户和后台对账。",
  },
];

export default async function Home() {
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
    <main className="overflow-hidden bg-[#f3f6fb] text-slate-950">
      <SiteHeader user={menuUser} />

      <section className="relative overflow-hidden bg-[#060914] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(118deg,#060914_0%,#091523_48%,#17202f_100%)]" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/80 to-transparent" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-sm text-cyan-100">
              <Sparkles className="h-4 w-4" />
              给 AI 助手和智能体使用的生成能力
            </p>
            <h1 className="mt-6 max-w-4xl text-[38px] font-semibold leading-[1.08] md:hidden">
              <span className="block">让通用 AI</span>
              <span className="block">助手瞬间接入</span>
              <span className="block">画图、做视频</span>
              <span className="block">的能力</span>
            </h1>
            <h1 className="mt-6 hidden max-w-4xl text-6xl font-semibold leading-[1.05] md:block xl:text-[68px]">
              让通用 AI 助手<br />
              瞬间接入画图、<br />
              做视频的能力
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              Aiyes 把图片生成、视频生成、任务查询、余额流水和 API Key 管理做成一套稳定接口，适合直接接入助手、智能体和内部系统。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user ? "/generate" : "/login?tab=register&next=/generate"}
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 font-medium text-slate-950 shadow-[0_20px_70px_rgba(125,211,252,.22)] hover:-translate-y-0.5"
              >
                立即开始 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.05] px-5 py-3 font-medium text-white hover:-translate-y-0.5 hover:bg-white/10"
              >
                查看接入方式
              </Link>
            </div>
          </div>

          <div className="relative mx-auto h-[600px] w-full max-w-[660px]">
            <div className="aiyes-stage-lines absolute inset-0 rounded-lg border border-white/10 bg-white/[0.03]" />
            <div className="absolute left-0 top-8 z-20 w-[88%] overflow-hidden rounded-lg border border-white/15 bg-[#0b1220] shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  生成任务运行台
                </div>
                <span className="rounded-md border border-cyan-200/20 bg-cyan-200/10 px-2 py-1 text-xs text-cyan-100">
                  async
                </span>
              </div>
              <div className="relative aspect-video overflow-hidden bg-slate-950">
                <HeroPreviewVideo
                  src="/hero/aiyes-preview-robot.mp4"
                  poster="/hero/aiyes-preview-robot.jpg"
                  label="视频结果预览"
                />
              </div>
              <div className="grid gap-px bg-white/10 md:grid-cols-3">
                <StatusCell label="模型" value="视频生成" />
                <StatusCell label="状态" value="已完成" />
                <StatusCell label="记录" value="可审计" />
              </div>
            </div>

            <div className="aiyes-float-soft absolute right-0 top-0 z-30 w-[38%] overflow-hidden rounded-lg border border-white/15 bg-slate-900 shadow-2xl shadow-black/45">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/hero/aiyes-hero-orchestrator-sm.webp"
                  alt="AI 助手能力编排示例"
                  fill
                  unoptimized
                  priority
                  sizes="(min-width: 1024px) 260px, 52vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="aiyes-float-delay absolute bottom-5 left-10 z-30 w-[52%] overflow-hidden rounded-lg border border-cyan-200/20 bg-slate-950 shadow-2xl shadow-black/50">
              <div className="relative aspect-video">
                <HeroPreviewVideo
                  src="/hero/aiyes-preview-sci-fi.mp4"
                  poster="/hero/aiyes-preview-sci-fi.jpg"
                  label="镜头动态生成"
                  compact
                />
              </div>
            </div>

            <div className="aiyes-float-slow absolute bottom-20 right-4 z-10 w-[50%] overflow-hidden rounded-lg border border-white/15 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/hero/aiyes-hero-vision-grid-sm.webp"
                  alt="多模态视觉生成示例"
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 340px, 70vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#eef3f8]">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-3 md:grid-cols-4">
            {capabilities.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">{item.icon}</div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-cyan-700">接入链路</p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold">从一句提示词到可查询、可对账的生成结果</h2>
            <p className="mt-5 max-w-xl leading-7 text-slate-600">
              请求进入任务系统后自动记录状态、结果和账务，不需要把这些逻辑分散在各个业务端。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {flowSteps.map((item, index) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">{item.icon}</div>
                  <span className="text-sm font-semibold text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cases" className="relative border-y border-white/10 bg-[#07111f] text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-cyan-200">精选样例</p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">经典案例</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              用真实任务结果做预览，页面上只呈现适合公开展示的图像和视频素材。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {caseStudies.map((item) => (
              <HoverVideoCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg bg-slate-950 p-8 text-white">
            <Blocks className="h-8 w-8 text-cyan-200" />
            <h2 className="mt-5 text-3xl font-semibold">面向正式接入，而不是一次性玩具页面</h2>
            <p className="mt-4 leading-7 text-slate-300">
              账号、充值、积分、生成记录、API Key 和后台管理已经围绕生产使用组织，后续可以继续扩展更多模型和企业权限。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={user ? "/generate" : "/login?tab=register&next=/generate"} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-slate-950">
                进入生成页 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/api-docs" className="inline-flex items-center gap-2 rounded-md border border-white/15 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">
                API 接入
              </Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={<ImageIcon />} title="统一生成入口" text="图片和视频都进入任务记录，便于用户在工作台继续查询。" />
            <Feature icon={<WalletCards />} title="余额与流水" text="充值、扣费、管理员调整进入同一类账务记录。" />
            <Feature icon={<ShieldCheck />} title="后台可管" text="用户、任务、充值和积分都可以通过 CMS 维护。" />
          </div>
        </div>
      </section>
      <LegalFooter tone="light" />
    </main>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-950/80 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">{icon}</div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </div>
  );
}
