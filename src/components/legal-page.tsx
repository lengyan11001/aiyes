import { SiteHeader } from "@/components/site-header";
import type { MenuUser } from "@/components/user-menu";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

export function LegalPage({
  title,
  description,
  updatedAt,
  sections,
  user,
}: {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
  user: MenuUser | null;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SiteHeader user={user} />
      <section className="border-b border-white/10 px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-slate-400">Legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-4 leading-7 text-slate-300">{description}</p>
          <p className="mt-3 text-sm text-slate-500">最后更新：{updatedAt}</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 leading-7 text-slate-300">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
