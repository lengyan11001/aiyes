import Link from "next/link";

export function LegalFooter({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const muted = tone === "dark" ? "text-slate-500" : "text-slate-500";
  const link = tone === "dark" ? "hover:text-white" : "hover:text-slate-950";

  return (
    <footer className={`border-t px-6 py-6 text-sm ${tone === "dark" ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 ${muted}`}>
        <p>© {new Date().getFullYear()} Aiyes</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/terms" className={link}>
            用户协议
          </Link>
          <Link href="/privacy" className={link}>
            隐私协议
          </Link>
          <Link href="/api-docs" className={link}>
            API 接入
          </Link>
        </nav>
      </div>
    </footer>
  );
}
