"use client";

import CommandSearch from "@/components/CommandSearch";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, Bell, Briefcase, Building2, FileText, Kanban, Library, LayoutDashboard,
  LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Sparkles, Users, X,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SetupScreen } from "@/components/SetupScreen";
import { BreathingLoader, LogoMark } from "@/components/ui";

// Icons: lucide-react. Map the names used across the layout to lucide components.
const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  opportunities: Briefcase,
  board: Kanban,
  intelligence: Sparkles,
  library: Library,
  companies: Building2,
  templates: FileText,
  team: Users,
  activity: Activity,
  settings: Settings,
  logout: LogOut,
  plus: Plus,
  search: Search,
  bell: Bell,
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  menu: Menu,
  close: X,
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? LayoutDashboard;
  return <Cmp className={className} strokeWidth={1.8} aria-hidden="true" />;
}

// Sidebar sections in the QTX order. Routes that exist but are not in the sidebar stay reachable from the top bar and links.
const NAV = [
  { href: "/dashboard", label: "Overview", icon: "overview", match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: "opportunities", match: (p: string) => p === "/dashboard/opportunities" || (p.startsWith("/dashboard/") && !NAV_RESERVED.some((r) => p === r || p.startsWith(r + "/"))) },
  { href: "/dashboard/board", label: "Board", icon: "board", match: (p: string) => p === "/dashboard/board" },
  { href: "/dashboard/intelligence", label: "Intelligence", icon: "intelligence", match: (p: string) => p === "/dashboard/intelligence" },
  { href: "/dashboard/library", label: "Library", icon: "library", match: (p: string) => p === "/dashboard/library" },
  { href: "/dashboard/companies", label: "Companies", icon: "companies", match: (p: string) => p === "/dashboard/companies" },
  { href: "/dashboard/templates", label: "Templates", icon: "templates", match: (p: string) => p === "/dashboard/templates" },
  { href: "/dashboard/team", label: "Team", icon: "team", match: (p: string) => p === "/dashboard/team" },
  { href: "/dashboard/activity", label: "Activity", icon: "activity", match: (p: string) => p === "/dashboard/activity" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", match: (p: string) => p === "/dashboard/settings" },
];

const NAV_RESERVED = [
  "/dashboard", "/dashboard/board", "/dashboard/intelligence", "/dashboard/library", "/dashboard/companies",
  "/dashboard/templates", "/dashboard/team", "/dashboard/activity", "/dashboard/settings", "/dashboard/new",
  "/dashboard/insights", "/dashboard/search", "/dashboard/opportunities", "/dashboard/notifications", "/dashboard/profile",
];

// Bell with unread count. Polls lightly.
function BellLink() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const pull = () =>
      api<{ unread: number }>("/api/notifications")
        .then((d) => alive && setUnread(d.unread))
        .catch(() => {});
    pull();
    const t = setInterval(pull, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <Link href="/dashboard/notifications" className="relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={`Notifications, ${unread} unread`}>
      <Icon name="bell" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-emerald-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-[#050505]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

// User menu: email, profile link, sign out. Closes on outside click or Escape.
function UserMenu({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-[#050505] hover:bg-emerald-400"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#050505]/[0.02] p-2">
          <p className="truncate px-3 py-2 text-xs text-slate-500">{email}</p>
          <Link role="menuitem" href="/dashboard/settings" onClick={() => setOpen(false)} className="flex min-h-[40px] items-center rounded-xl px-3 text-sm text-slate-700 hover:bg-slate-50">
            Profile and password
          </Link>
          <button role="menuitem" type="button" onClick={onSignOut} className="flex min-h-[40px] w-full items-center rounded-xl px-3 text-left text-sm text-slate-700 hover:bg-slate-50">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Protected area. middleware.ts already blocks signed-out visitors. This layout provides the sidebar,
// top bar (search, bell, user menu), mobile bottom tabs and drawer, and keyboard shortcuts.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [setup, setSetup] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  useEffect(() => setDrawerOpen(false), [pathname]);

  // Keyboard shortcuts: n = new RFQ, / = search, ? = this list. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        router.push("/dashboard/new");
      } else if (e.key === "/") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("vf:open-search"));
      } else if (e.key === "?") {
        setHelpOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

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

  const sideW = collapsed ? "w-16" : "w-64";
  const mainPl = collapsed ? "md:pl-16" : "md:pl-64";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <CommandSearch />

      {/* ---------- Desktop sidebar ---------- */}
      <aside aria-label="Primary" className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/10 bg-[#050505]/[0.02] md:flex ${sideW}`}>
        <div className={`flex h-16 items-center gap-2.5 border-b border-slate-200 px-4 ${collapsed ? "justify-center px-0" : ""}`}>
          {collapsed ? <LogoMark size={26} /> : <LogoMark size={26} wordmark />}
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                  active ? "bg-emerald-500/10 text-emerald-400" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon name={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-slate-200 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={`flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
            {!collapsed && <span>Collapse</span>}
          </button>
          <button
            type="button"
            onClick={signOut}
            title="Sign out"
            className={`flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icon name="logout" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ---------- Top bar (all sizes): search, New RFQ, bell, user menu ---------- */}
      <header className={`fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-white/10 bg-[#050505]/[0.02] px-4 sm:px-6 ${mainPl}`}>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="app-drawer"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
          >
            <Icon name="menu" />
          </button>
          <LogoMark size={26} />
        </div>
        <button
          type="button"
          onClick={() => document.dispatchEvent(new CustomEvent("vf:open-search"))}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-left text-sm text-slate-500 hover:border-slate-400 md:max-w-md"
          aria-label="Search (press /)"
        >
          <Icon name="search" className="h-4 w-4 shrink-0" />
          <span className="truncate">Search opportunities, requirements</span>
          <kbd className="ml-auto hidden rounded border border-slate-300 bg-white/[0.02] px-1.5 text-xs text-slate-500 sm:inline">/</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard/new" className="btn-primary hidden sm:inline-flex">
            <Icon name="plus" className="h-4 w-4" />
            New RFQ
          </Link>
          <BellLink />
          <UserMenu email={email} onSignOut={signOut} />
        </div>
      </header>

      {/* ---------- Mobile drawer ---------- */}
      <div className={`fixed inset-0 z-50 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`}>
        <div onClick={() => setDrawerOpen(false)} className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
        <aside
          id="app-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          aria-hidden={!drawerOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-white/10 bg-[#050505]/[0.02] p-4 transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5 text-base font-semibold">
              <LogoMark size={28} />
              Vantorflow
            </span>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100">
              <Icon name="close" />
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.match(pathname) ? "page" : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-base ${item.match(pathname) ? "bg-emerald-500/10 text-emerald-400" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-200 pt-4">
            {email && <p className="truncate px-1 pb-3 text-xs text-slate-500">{email}</p>}
            <button type="button" onClick={signOut} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-base text-slate-700 hover:bg-slate-100">
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* ---------- Mobile bottom tabs ---------- */}
      <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050505]/[0.02] pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {[NAV[0], NAV[1], NAV[2], NAV[3]].map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-emerald-400" : "text-slate-600"}`}>
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------- Keyboard shortcut help ---------- */}
      {helpOpen && (
        <div role="dialog" aria-label="Keyboard shortcuts" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setHelpOpen(false)}>
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-600">New RFQ</dt><dd><kbd className="rounded border border-slate-300 px-1.5">n</kbd></dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Search</dt><dd><kbd className="rounded border border-slate-300 px-1.5">/</kbd></dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">Search (also)</dt><dd><kbd className="rounded border border-slate-300 px-1.5">Ctrl/Cmd K</kbd></dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">This list</dt><dd><kbd className="rounded border border-slate-300 px-1.5">?</kbd></dd></div>
            </dl>
            <button type="button" className="btn-secondary mt-6 w-full" onClick={() => setHelpOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* ---------- Content ---------- */}
      <main className={`mx-auto w-full max-w-6xl px-4 pb-24 pt-20 sm:px-6 md:pb-12 md:pt-24 ${mainPl}`}>
        {setup === null ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <BreathingLoader label="Checking the database" />
          </div>
        ) : setup.ready ? (
          <div key={pathname}>{children}</div>
        ) : (
          <SetupScreen missing={setup.missing} onRecheck={checkSetup} />
        )}
      </main>
    </div>
  );
}
