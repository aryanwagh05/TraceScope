"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BookOpen,
  Braces,
  Database,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  LockKeyhole,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/traces", label: "Traces", icon: Activity },
  { href: "/evals", label: "Evals", icon: FlaskConical },
  { href: "/experiments", label: "Experiments", icon: GitCompareArrows },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/datasets", label: "Datasets", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/docs", label: "Integration", icon: BookOpen },
];

export function AppShell({
  children,
  workspaceName,
  ownerName,
}: {
  children: React.ReactNode;
  workspaceName: string;
  ownerName: string;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-border bg-[#fbfaf6] px-4 py-5 lg:block">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-[#ffffff]">
            <Braces size={22} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-muted">TraceScope</p>
            <p className="text-xs text-muted">LLM reliability console</p>
          </div>
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { color: "#ffffff" } : undefined}
                className={clsx(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  active
                    ? "bg-ink text-[#ffffff]"
                    : "text-muted hover:bg-surface-strong hover:text-ink",
                )}
              >
                <Icon size={17} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted">Workspace</p>
          <p className="mt-1 text-sm font-semibold text-ink">{workspaceName}</p>
          <p className="mt-1 text-xs text-muted">{ownerName}</p>
          <a
            href="/api/auth/logout"
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-scope-blue"
          >
            <LockKeyhole size={13} />
            Lock console
          </a>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-[#fbfaf6]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink text-[#ffffff]">
              <Braces size={20} strokeWidth={1.8} />
            </div>
            <span className="text-sm font-semibold">TraceScope</span>
          </Link>
          <a
            href="/api/auth/logout"
            className="inline-flex items-center gap-2 text-xs font-semibold text-scope-blue"
          >
            <LockKeyhole size={14} />
            Lock
          </a>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { color: "#ffffff" } : undefined}
                className={clsx(
                  "flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium",
                  active
                    ? "border-ink bg-ink text-[#ffffff]"
                    : "border-border bg-surface text-muted",
                )}
              >
                <Icon size={15} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
