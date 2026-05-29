import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { LegalFooter } from "@/components/legal-footer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="px-6 py-10">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_420px]">
          <section>
            <Link href="/" className="text-xl font-semibold">Aiyes</Link>
            <h1 className="mt-10 text-4xl font-semibold leading-tight">账号密码登录，管理生成能力与 API 调用。</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
              用户注册后可以创建 API Key、查看余额与任务记录。管理员可在后台审核用户、查看消费和任务状态。
            </p>
          </section>
          <Suspense>
            <AuthForm />
          </Suspense>
        </div>
      </div>
      <LegalFooter />
    </main>
  );
}
