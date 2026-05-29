"use client";

import { useState } from "react";
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
  CalendarCheck,
  Users,
  FileBarChart,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  full_name: string | null;
  role: "student" | "teacher" | "admin";
  avatar_url: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// ─── Navigation config ────────────────────────────────────────────────────────
const studentNav: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard/student",             icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
  { label: "Programım",    href: "/dashboard/student/program",     icon: <CalendarDays className="w-4.5 h-4.5" /> },
  { label: "Denemelerim",  href: "/dashboard/student/mock-exams",  icon: <BarChart2 className="w-4.5 h-4.5" /> },
  { label: "Önerilerim",   href: "/dashboard/student/recommendations", icon: <BookOpen className="w-4.5 h-4.5" /> },
  { label: "DORA",         href: "/dashboard/student/dora",        icon: <Bot className="w-4.5 h-4.5" /> },
  { label: "Testler",      href: "/dashboard/student/testler",     icon: <HeartPulse className="w-4.5 h-4.5" /> },
  { label: "Randevular",   href: "/dashboard/student/randevular",  icon: <CalendarCheck className="w-4.5 h-4.5" /> },
];

const teacherNav: NavItem[] = [
  { label: "Dashboard",      href: "/dashboard/teacher",                  icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
  { label: "Öğrencilerim",   href: "/dashboard/teacher/ogrenciler",       icon: <Users className="w-4.5 h-4.5" /> },
  { label: "Randevular",     href: "/dashboard/teacher/randevular",       icon: <CalendarCheck className="w-4.5 h-4.5" /> },
  { label: "Raporlar",       href: "/dashboard/teacher/raporlar",         icon: <FileBarChart className="w-4.5 h-4.5" /> },
];

// ─── Gradient helpers ─────────────────────────────────────────────────────────
const gradientText =
  "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-transparent";

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({
  profile,
  open,
  onClose,
}: {
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = profile.role === "teacher" ? teacherNav : studentNav;
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 flex flex-col
          bg-[#07071a] border-r border-white/5
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center shadow-lg shadow-[#7B2FFF]/30">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className={`text-lg font-black tracking-widest uppercase ${gradientText}`}>
              MINDORA
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-white/30 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-3">
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
            ${profile.role === "teacher"
              ? "bg-[#4F7CFF]/15 text-[#7AB3FF] border border-[#4F7CFF]/25"
              : "bg-[#7B2FFF]/15 text-[#A78BFF] border border-[#7B2FFF]/25"
            }
          `}>
            {profile.role === "teacher" ? "Öğretmen Paneli" : "Öğrenci Paneli"}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
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
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-[#7B2FFF]/20 to-[#4F7CFF]/10 text-white border border-[#7B2FFF]/30 shadow-sm shadow-[#7B2FFF]/10"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span className={active ? "text-[#A78BFF]" : "text-white/30 group-hover:text-white/60 transition-colors"}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 text-[#7B2FFF]/60" />}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {profile.full_name ?? "Kullanıcı"}
              </p>
              <p className="text-white/30 text-[10px] capitalize">{profile.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Çıkış Yap"
              className="text-white/20 hover:text-red-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
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
      student:    "Ana Sayfa",
      teacher:    "Ana Sayfa",
      program:    "Çalışma Programım",
      denemeler:  "Deneme Analizleri",
      kaynaklar:  "Kaynaklar",
      dora:       "DORA ile Konuş",
      testler:    "Testler & Envanter",
      randevular: "Randevularım",
      ogrenciler: "Öğrencilerim",
      raporlar:   "Raporlar",
    };
    return titles[last] ?? "Dashboard";
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-[#07071a]/80 backdrop-blur-md border-b border-white/5 shrink-0">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white/40 hover:text-white transition-colors p-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-base">{getPageTitle()}</h1>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        <button className="relative w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#7B2FFF] ring-2 ring-[#07071a]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-xs font-bold">
          {profile.full_name
            ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#05050f] overflow-hidden">
      <Sidebar
        profile={profile}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          profile={profile}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
