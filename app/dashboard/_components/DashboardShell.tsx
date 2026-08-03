"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  CalendarDays,
  BarChart2,
  BookOpen,
  Bot,
  HeartPulse,
  Compass,
  CalendarCheck,
  Users,
  FileBarChart,
  Library,
  MessageSquareText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Settings,
  NotebookPen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markIntentionalSignOut } from "@/lib/supabase/auth-session";
import { resolveTheme } from "@/lib/themes";
import { useSidebarExpanded } from "@/lib/hooks/use-sidebar-expanded";
import NotificationsBell from "./NotificationsBell";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  full_name: string | null;
  role: "student" | "teacher" | "admin";
  avatar_url: string | null;
  theme?: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// ─── Navigation config ────────────────────────────────────────────────────────
const studentNav: NavItem[] = [
  { label: "Ana Sayfa",    href: "/dashboard/student",             icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
  { label: "Programım",    href: "/dashboard/student/program",     icon: <CalendarDays className="w-4.5 h-4.5" /> },
  { label: "Denemelerim",  href: "/dashboard/student/mock-exams",  icon: <BarChart2 className="w-4.5 h-4.5" /> },
  { label: "Hata Defteri", href: "/dashboard/student/mistakes", icon: <NotebookPen className="w-4.5 h-4.5" /> },
  { label: "Önerilerim",   href: "/dashboard/student/recommendations", icon: <BookOpen className="w-4.5 h-4.5" /> },
  { label: "Kaynaklarım",  href: "/dashboard/student/resources",       icon: <Library className="w-4.5 h-4.5" /> },
  { label: "DORA",         href: "/dashboard/student/dora",        icon: <Bot className="w-4.5 h-4.5" /> },
  { label: "Testler",      href: "/dashboard/student/tests",       icon: <HeartPulse className="w-4.5 h-4.5" /> },
  { label: "Rehberlik",    href: "/dashboard/student/guidance",    icon: <Compass className="w-4.5 h-4.5" /> },
  { label: "Randevular",   href: "/dashboard/student/randevular",  icon: <CalendarCheck className="w-4.5 h-4.5" /> },
  { label: "Ayarlar",      href: "/dashboard/settings",            icon: <Settings className="w-4.5 h-4.5" /> },
];

const teacherNav: NavItem[] = [
  { label: "Ana Sayfa",      href: "/dashboard/teacher",                  icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
  { label: "Öğrencilerim",   href: "/dashboard/teacher/students",         icon: <Users className="w-4.5 h-4.5" /> },
  { label: "Randevular",     href: "/dashboard/teacher/appointments",     icon: <CalendarCheck className="w-4.5 h-4.5" /> },
  { label: "Görüşme Notları", href: "/dashboard/teacher/meetings",        icon: <MessageSquareText className="w-4.5 h-4.5" /> },
  { label: "Kaynak Takibi",  href: "/dashboard/teacher/resources",        icon: <Library className="w-4.5 h-4.5" /> },
  { label: "Hata Defteri", href: "/dashboard/teacher/mistakes", icon: <NotebookPen className="w-4.5 h-4.5" /> },
  { label: "Test Sonuçları", href: "/dashboard/teacher/tests",            icon: <HeartPulse className="w-4.5 h-4.5" /> },
  { label: "Rehberlik",      href: "/dashboard/teacher/guidance",         icon: <Compass className="w-4.5 h-4.5" /> },
  { label: "Raporlar",       href: "/dashboard/teacher/reports",          icon: <FileBarChart className="w-4.5 h-4.5" /> },
  { label: "Ayarlar",        href: "/dashboard/settings",                 icon: <Settings className="w-4.5 h-4.5" /> },
];

const adminNav: NavItem[] = [
  { label: "Yönetim Paneli", href: "/dashboard/admin/content",            icon: <Settings className="w-4.5 h-4.5" /> },
  { label: "Ayarlar",        href: "/dashboard/settings",                 icon: <Settings className="w-4.5 h-4.5" /> },
];

// ─── Gradient helpers ─────────────────────────────────────────────────────────
const gradientText =
  "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] bg-clip-text text-transparent";

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  profile,
  open,
  onClose,
  expanded,
  onToggleExpanded,
}: {
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = profile.role === "admin"
    ? adminNav
    : profile.role === "teacher"
    ? teacherNav
    : studentNav;
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    markIntentionalSignOut();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
  };

  const roleLabel =
    profile.role === "admin"
      ? "Admin Paneli"
      : profile.role === "teacher"
      ? "Öğretmen Paneli"
      : "Öğrenci Paneli";

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel — mobilde her zaman w-64 drawer; lg'de collapsible */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full flex flex-col
          bg-[var(--sidebar)] border-r border-white/5
          w-64
          transition-[transform,width] duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
          ${expanded ? "lg:w-64" : "lg:w-16"}
        `}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b border-white/5 py-5 ${
            expanded ? "justify-between px-5" : "justify-center px-2 lg:px-0"
          }`}
        >
          <Link
            href="/"
            className={`flex items-center gap-2.5 ${expanded ? "" : "lg:justify-center"}`}
            title="MINDORA"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] shadow-lg shadow-[var(--primary)]/30">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span
              className={`text-lg font-black tracking-widest uppercase ${gradientText} ${
                expanded ? "" : "lg:hidden"
              }`}
            >
              MINDORA
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 transition-colors hover:text-white lg:hidden"
            aria-label="Menüyü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className={`py-3 ${expanded ? "px-5" : "px-2 lg:px-1.5"}`}>
          <span
            title={roleLabel}
            className={`
              inline-flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest
              ${expanded ? "px-2.5 py-1" : "lg:justify-center lg:px-1.5 lg:py-1.5"}
              ${
                profile.role === "admin"
                  ? "border border-red-500/25 bg-red-500/15 text-red-300"
                  : profile.role === "teacher"
                  ? "border border-[#4F7CFF]/25 bg-[#4F7CFF]/15 text-[#7AB3FF]"
                  : "border border-[#7B2FFF]/25 bg-[#7B2FFF]/15 text-[#A78BFF]"
              }
            `}
          >
            <span className={expanded ? "" : "lg:hidden"}>{roleLabel}</span>
            <span className={`hidden ${expanded ? "" : "lg:inline"}`}>
              {profile.role === "admin"
                ? "A"
                : profile.role === "teacher"
                ? "K"
                : "Ö"}
            </span>
          </span>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 space-y-0.5 overflow-y-auto py-2 ${
            expanded ? "px-3" : "px-3 lg:px-2"
          }`}
        >
          {nav.map((item) => {
            const active =
              item.href === `/dashboard/${profile.role}`
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={item.label}
                className={`
                  group flex items-center rounded-xl text-sm font-medium transition-all duration-200
                  ${expanded ? "gap-3 px-3 py-2.5" : "gap-3 px-3 py-2.5 lg:justify-center lg:px-0 lg:py-2.5"}
                  ${
                    active
                      ? "border border-[var(--sidebar-active)]/30 bg-[var(--sidebar-active)]/20 text-white shadow-sm shadow-[var(--sidebar-active)]/10"
                      : "text-white/40 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <span
                  className={`shrink-0 ${
                    active
                      ? "text-[var(--sidebar-active)]"
                      : "text-white/30 transition-colors group-hover:text-white/60"
                  }`}
                >
                  {item.icon}
                </span>
                <span className={`flex-1 truncate ${expanded ? "" : "lg:hidden"}`}>
                  {item.label}
                </span>
                {active && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 text-[var(--sidebar-active)]/60 ${
                      expanded ? "" : "lg:hidden"
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle — yalnızca masaüstü */}
        <div className={`hidden border-t border-white/5 py-2 lg:block ${expanded ? "px-3" : "px-2"}`}>
          <button
            type="button"
            onClick={onToggleExpanded}
            title={expanded ? "Paneli daralt" : "Paneli genişlet"}
            aria-label={expanded ? "Paneli daralt" : "Paneli genişlet"}
            aria-expanded={expanded}
            className={`flex w-full items-center rounded-xl border border-white/5 bg-white/[0.03] py-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white ${
              expanded ? "justify-between px-3" : "justify-center px-0"
            }`}
          >
            {expanded && (
              <span className="text-[11px] font-semibold">Daralt</span>
            )}
            {expanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* User info + sign out */}
        <div className={`border-t border-white/5 py-4 ${expanded ? "px-3" : "px-3 lg:px-2"}`}>
          <div
            className={`flex items-center rounded-xl border border-white/5 bg-white/3 ${
              expanded ? "gap-3 px-3 py-2.5" : "gap-3 px-3 py-2.5 lg:flex-col lg:gap-2 lg:px-1 lg:py-2"
            }`}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-xs font-bold text-white"
              title={profile.full_name ?? "Kullanıcı"}
            >
              {initials}
            </div>
            <div className={`min-w-0 flex-1 ${expanded ? "" : "lg:hidden"}`}>
              <p className="truncate text-xs font-semibold text-white">
                {profile.full_name ?? "Kullanıcı"}
              </p>
              <p className="text-[10px] capitalize text-white/30">{profile.role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
              className="p-1 text-white/20 transition-colors hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({
  profile,
  onMenuClick,
}: {
  profile: UserProfile;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();

  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    const titles: Record<string, string> = {
      student:        "Ana Sayfa",
      teacher:        "Ana Sayfa",
      admin:          "Yönetim Paneli",
      content:        "İçerik Yönetim Sistemi (CMS)",
      program:        "Çalışma Programım",
      "mock-exams":   "Deneme Analizleri",
      recommendations:"DORA Önerileri",
      progress:       "Konu İlerlemem",
      denemeler:      "Deneme Analizleri",
      kaynaklar:      "Kaynaklar",
      dora:           "DORA ile Konuş",
      testler:        "Testler & Envanter",
      tests:          "Testler & Envanterler",
      guidance:       "Rehberlik Merkezi",
      randevular:     "Randevularım",
      ogrenciler:     "Öğrencilerim",
      students:       "Öğrencilerim",
      appointments:   "Randevular",
      availability:   "Müsaitlik Ayarları",
      meetings:       "Görüşme Notları",
      resources:      "Kaynak Takibi",
      reports:        "Raporlar",
      raporlar:       "Raporlar",
      settings:       "Ayarlar",
      mistakes:       "Hata Defteri",
    };
    return titles[last] ?? "Dashboard";
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 backdrop-blur-md md:px-6">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-[var(--text-primary)]">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        <NotificationsBell userId={profile.id} role={profile.role} />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-xs font-bold text-white">
          {profile.full_name
            ? profile.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "?"}
        </div>
      </div>
    </header>
  );
}

// ─── DashboardShell ───────────────────────────────────────────────────────────
export default function DashboardShell({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { expanded, toggleExpanded } = useSidebarExpanded();
  const theme = resolveTheme(profile.theme);

  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    root.setAttribute("data-theme", theme);
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
    };
  }, [theme]);

  return (
    <div
      data-dashboard-shell
      data-theme={theme}
      className="flex h-screen overflow-hidden bg-[var(--bg)]"
    >
      <Sidebar
        profile={profile}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
      />

      {/* Main content — flex-1 sidebar daralınca akıcı genişler */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200">
        <Topbar
          profile={profile}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
