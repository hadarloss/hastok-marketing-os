"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "בית", icon: "🏠" },
  { href: "/teams/marketing", label: "שיווק", icon: "📣" },
  { href: "/teams/branding", label: "מיתוג", icon: "🎨" },
  { href: "/onboarding", label: "אוריתה", icon: "🧭" },
  { href: "/agents/quality_assurance", label: "ערן — QA", icon: "✅" },
  { href: "/memory-log", label: "יומן זיכרון", icon: "🧠" },
  { href: "/business-profile", label: "פרופיל עסקי", icon: "🗂️" },
  { href: "/outputs", label: "תוצרים", icon: "📦" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  // Full navigation (not router.push) so proxy.ts re-checks with the now-cleared cookie.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full w-full">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-e border-border bg-sidebar text-sidebar-foreground p-3 gap-1">
        <div className="px-2 py-3 mb-2">
          <div className="text-sm font-semibold text-sidebar-foreground">צוות ה-AI שלי</div>
          <div className="text-xs text-muted-foreground">שיווק ומיתוג, במקום אחד</div>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                isActive(pathname, item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <span aria-hidden>🚪</span>
          <span>יציאה</span>
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-border p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">צוות ה-AI שלי</div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              🚪 יציאה
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shrink-0 transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/60"
                )}
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
