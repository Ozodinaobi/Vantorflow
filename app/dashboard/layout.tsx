"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SetupScreen } from "@/components/SetupScreen";
import { BreathingLoader, GlowOrbs, LogoMark } from "@/components/ui";

// Icons are inline SVG so there is no icon dependency.
const ICONS = {
  list: (
    <path d="M4 6h16M4 12h16M4 18h10" />
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  collapse: <path d="M15 6l-6 6 6 6" />,
  expand: <path d="M9 6l6 6-6 6" />,
};

function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Opportunities", icon: "list" as const, match: (p: string) => p === "/dashboard" || (p.startsWith("/dashboard/") && p !== "/dashboard/new") },
  { href: "/dashboard/new", label: "New RFQ", icon: "plus" as const, match: (p: string) => p === "/dashboard/new" },
];

// Animated hamburger: three bars that fold into an X while open.
function Hamburger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="app-drawer"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-bone transition-colors hover:border-white/25"
    >
      <span className="relative block h-3.5 w-5" aria-hidden="true">
        <span
          className={`absolute left-0 top-0 h-px w-5 bg-current transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-y-[6.5px] rotate-45" : ""}`}
        />
        <span
          className={`absolute left-0 top-[6.5px] h-px w-5 bg-current transition-opacity duration-300 ${open ? "opacity-0" : "opacity-100"}`}
        />
        <span
          className={`absolute left-0 top-[13px] h-px w-5 bg-current transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`}
        />
      </span>
    </button>
  );
}

// Protected area. middleware.ts already blocks signed-out visitors; this layout shows navigation,
// the sign-out button, and the one-time database setup screen when tables are missing.
// Layout: sidebar (md+, icon-only below lg, expandable at lg), slide-in drawer + bottom tab bar (below md).
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [setup, setSetup] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const checkSetup = useCallback(async () => {
    try {
      const s = await api<{ ready: boolean; missing: string[] }>("/api/setup/status");
      setSetup(s);
    } catch {
      setSetup({ ready: false, missing: [] });
    }
  }, []);

  useEffect(() => {
    api<{ email: string }>("/api/auth/session")
      .then((s) => setEmail(s.email))
      .catch(() => router.replace("/login"));
    checkSetup();
  }, [router, checkSetup]);

  // Close the drawer on route change, on Escape, and lock background scroll while it is open.
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GlowOrbs className="fixed" />

      {/* ---------- Desktop / tablet sidebar ---------- */}
      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/5 bg-ink/70 backdrop-blur-xl transition-[width] duration-500 ease-out-expo md:flex ${
          collapsed ? "md:w-20" : "md:w-20 lg:w-64"
        }`}
      >
        <div className={`flex h-16 items-center gap-3 px-5 ${collapsed ? "justify-center px-0" : "lg:px-5"}`}>
          <LogoMark />
          <span className={`font-serif text-lg tracking-tight ${collapsed ? "hidden" : "hidden lg:inline"}`}>Vantorflow</span>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3 text-sm transition-colors duration-300 ${
                  active ? "bg-white/[0.06] text-bone" : "text-bone/60 hover:bg-white/[0.03] hover:text-bone"
                } ${collapsed ? "justify-center" : "lg:justify-start"}`}
              >
                <Icon name={item.icon} />
                <span className={collapsed ? "hidden" : "hidden lg:inline"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="hidden min-h-[44px] w-full items-center justify-center gap-3 rounded-2xl px-3 text-sm text-bone/50 transition-colors hover:bg-white/[0.03] hover:text-bone lg:flex lg:justify-start"
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
            <span className={collapsed ? "hidden" : "hidden lg:inline"}>Collapse</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 text-sm text-bone/50 transition-colors hover:bg-white/[0.03] hover:text-bone ${
              collapsed ? "justify-center" : "lg:justify-start"
            }`}
          >
            <Icon name="logout" />
            <span className={collapsed ? "hidden" : "hidden lg:inline"}>Sign out</span>
          </button>
          {email && (
            <p className={`truncate px-3 pt-2 text-xs text-white/30 ${collapsed ? "hidden" : "hidden lg:block"}`}>{email}</p>
          )}
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex min-h-[44px] items-center gap-2.5" aria-label="Vantorflow home">
            <LogoMark size={28} />
            <span className="font-serif text-lg tracking-tight">Vantorflow</span>
          </Link>
          <Hamburger open={drawerOpen} onClick={() => setDrawerOpen((o) => !o)} />
        </div>
      </header>

      {/* ---------- Mobile slide-in drawer ---------- */}
      <div className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        <aside
          id="app-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          aria-hidden={!drawerOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-white/10 bg-ink/95 p-5 backdrop-blur-xl transition-transform duration-500 ease-out-expo ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 font-serif text-lg">
              <LogoMark size={28} />
              Vantorflow
            </span>
            <Hamburger open={drawerOpen} onClick={() => setDrawerOpen(false)} />
          </div>
          <nav className="mt-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.match(pathname) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-4 text-base ${
                  item.match(pathname) ? "bg-white/[0.06] text-bone" : "text-bone/70 hover:bg-white/[0.03]"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-white/5 pt-4">
            {email && <p className="truncate px-1 pb-3 text-xs text-white/35">{email}</p>}
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-4 text-base text-bone/70 hover:bg-white/[0.03]"
            >
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* ---------- Mobile bottom tab bar ---------- */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-2 px-3">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                    active ? "text-emerald-400" : "text-bone/50"
                  }`}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------- Content ---------- */}
      <main
        className={`relative z-10 mx-auto w-full max-w-6xl px-4 pb-28 pt-6 transition-[padding] duration-500 ease-out-expo sm:px-6 md:pb-12 md:pt-10 ${
          collapsed ? "md:pl-28" : "md:pl-28 lg:pl-72"
        }`}
      >
        {setup === null ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <BreathingLoader label="Checking the database" />
          </div>
        ) : setup.ready ? (
          <div key={pathname} className="animate-fade-rise">
            {children}
          </div>
        ) : (
          <SetupScreen missing={setup.missing} onRecheck={checkSetup} />
        )}
      </main>
    </div>
  );
}
