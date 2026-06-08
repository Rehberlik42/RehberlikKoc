import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  CalendarClock,
  ClipboardList,
  Sparkles,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  Activity,
  BarChart2,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  gradeToExam,
  initialsFromName,
  targetExamColors,
} from "@/lib/student-helpers";
import SummaryCard from "./_components/SummaryCard";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UpcomingAppointment {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  student: {
    id: string;
    full_name: string | null;
    grade: string | null;
  } | null;
}

interface RecentStudent {
  id: string;
  full_name: string | null;
  grade: string | null;
  school: string | null;
  created_at: string | null;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function appointmentDayLabel(appointmentDate: string): "Bugün" | "Yarın" | null {
  const date = new Date(appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const apptDay = new Date(date);
  apptDay.setHours(0, 0, 0, 0);
  if (apptDay.getTime() === today.getTime()) return "Bugün";
  if (apptDay.getTime() === tomorrow.getTime()) return "Yarın";
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function TeacherDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");

  const weekStartStr = startOfWeek(new Date()).toISOString().slice(0, 10);
  const monthStartStr = startOfMonth(new Date()).toISOString().slice(0, 10);

  // ─── Sayim sorgulari (head: true → veri taşımaz, sadece count) ─────────────
  const [
    { count: studentCount },
    { count: pendingAppointmentsCount },
    { count: testResultsCount },
    { count: weeklySessionsCount },
    { count: monthlyMockExamsCount },
    { count: confirmedAppointmentsCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("role", "student"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("status", "pending"),
    // test_results: RLS sayesinde sadece öğretmenin atadığı öğrencilerin testleri sayılır
    supabase
      .from("test_results")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("study_sessions")
      .select("*", { count: "exact", head: true })
      .gte("study_date", weekStartStr),
    supabase
      .from("mock_exams")
      .select("*", { count: "exact", head: true })
      .gte("exam_date", monthStartStr),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("status", "confirmed"),
  ]);

  // ─── Yaklaşan randevular (sadece bugün ve sonrası, en fazla 4) ────────────
  const todayIso = new Date(
    new Date().setHours(0, 0, 0, 0)
  ).toISOString();

  const { data: rawUpcoming } = await supabase
    .from("appointments")
    .select(
      `id, appointment_date, duration_minutes, status,
       student:profiles!appointments_student_id_fkey(id, full_name, grade)`
    )
    .eq("teacher_id", user.id)
    .in("status", ["pending", "confirmed"])
    .gte("appointment_date", todayIso)
    .order("appointment_date", { ascending: true })
    .limit(4);

  const upcomingAppointments =
    (rawUpcoming ?? []) as unknown as UpcomingAppointment[];

  // ─── Son eklenen öğrenciler (en fazla 4) ────────────────────────────────
  const { data: rawRecentStudents } = await supabase
    .from("profiles")
    .select("id, full_name, grade, school, created_at")
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(4);

  const recentStudents = (rawRecentStudents ?? []) as RecentStudent[];

  const hour = new Date().getHours();
  const salut =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  const summaryCards = [
    {
      icon: <Users className="h-5 w-5" />,
      label: "Aktif Öğrencilerim",
      value: studentCount ?? 0,
      sub: "Bana atanmış öğrenciler",
      href: "/dashboard/teacher/students",
      ctaLabel: "Listeyi gör",
      glow: "radial-gradient(circle, rgba(123,47,255,0.35) 0%, transparent 70%)",
      accent: "text-[#A78BFF]",
    },
    {
      icon: <CalendarClock className="h-5 w-5" />,
      label: "Bekleyen Randevular",
      value: pendingAppointmentsCount ?? 0,
      sub: "Onayını bekleyen seanslar",
      href: "/dashboard/teacher/appointments",
      ctaLabel: "Randevulara git",
      glow: "radial-gradient(circle, rgba(79,124,255,0.35) 0%, transparent 70%)",
      accent: "text-[#7AB3FF]",
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "İncelenecek Testler",
      value: testResultsCount ?? 0,
      sub: "Öğrencilerinin test sonuçları",
      href: "/dashboard/teacher/tests",
      ctaLabel: "Testlere git",
      glow: "radial-gradient(circle, rgba(0,212,255,0.35) 0%, transparent 70%)",
      accent: "text-[#70E6FF]",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      label: "Bu Hafta Oturum",
      value: weeklySessionsCount ?? 0,
      sub: "Pazartesiden bu yana çalışma kaydı",
      href: "/dashboard/teacher/students",
      ctaLabel: "Öğrencilere git",
      glow: "radial-gradient(circle, rgba(123,47,255,0.28) 0%, transparent 70%)",
      accent: "text-[#A78BFF]",
    },
    {
      icon: <BarChart2 className="h-5 w-5" />,
      label: "Bu Ay Deneme",
      value: monthlyMockExamsCount ?? 0,
      sub: "Ay başından bu yana deneme sayısı",
      href: "/dashboard/teacher/students",
      ctaLabel: "Öğrencilere git",
      glow: "radial-gradient(circle, rgba(79,124,255,0.28) 0%, transparent 70%)",
      accent: "text-[#7AB3FF]",
    },
    {
      icon: <CalendarCheck className="h-5 w-5" />,
      label: "Onaylı Randevu",
      value: confirmedAppointmentsCount ?? 0,
      sub: "Onaylanmış toplam seans",
      href: "/dashboard/teacher/appointments",
      ctaLabel: "Randevulara git",
      glow: "radial-gradient(circle, rgba(0,212,255,0.28) 0%, transparent 70%)",
      accent: "text-[#70E6FF]",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#4F7CFF]/25 bg-[#4F7CFF]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7AB3FF]">
          <Sparkles className="h-3 w-3" />
          MINDORA · Koçluk
        </div>
        <h2 className="text-2xl font-black text-white sm:text-3xl">
          Eğitim Koçu Kontrol Paneli
        </h2>
        <p className="text-sm text-white/40">
          {salut}, {profile?.full_name ?? "Öğretmen"}. Bugün öğrencilerinin
          ilerlemesine göz atalım.
        </p>
      </div>

      {/* ─── 6 özet kart (2x3) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card, index) => (
          <div
            key={card.label}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <SummaryCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              sub={card.sub}
              href={card.href}
              ctaLabel={card.ctaLabel}
              glow={card.glow}
              accent={card.accent}
            />
          </div>
        ))}
      </div>

      {/* ─── Alt grid: yaklaşan randevular + son atanan öğrenciler ─────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <UpcomingPanel appointments={upcomingAppointments} />
        <RecentStudentsPanel students={recentStudents} />
      </div>
    </div>
  );
}

// ─── UpcomingPanel ────────────────────────────────────────────────────────────
function UpcomingPanel({
  appointments,
}: {
  appointments: UpcomingAppointment[];
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-white/8 bg-slate-900/40 p-5 backdrop-blur-md duration-500 lg:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#4F7CFF]/25 bg-[#4F7CFF]/15 text-[#7AB3FF]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Yaklaşan Randevular</h3>
        </div>
        <Link
          href="/dashboard/teacher/appointments"
          className="flex items-center gap-1 text-xs font-semibold text-[#7AB3FF] transition-colors hover:text-white"
        >
          Tümü <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyHint
          icon={<CalendarClock className="h-5 w-5 text-white/30" />}
          title="Yaklaşan randevu yok"
          desc="Öğrencilerinden yeni bir seans talebi geldiğinde burada listelenecek."
        />
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => {
            const date = new Date(a.appointment_date);
            const dateStr = date.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "short",
              weekday: "short",
            });
            const timeStr = date.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isPending = a.status === "pending";
            const dayLabel = appointmentDayLabel(a.appointment_date);
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-[#0d0d2b]">
                  <span className="text-[10px] font-bold leading-none text-white/40">
                    {date
                      .toLocaleDateString("tr-TR", { month: "short" })
                      .toUpperCase()}
                  </span>
                  <span className="text-sm font-black leading-tight text-white">
                    {date.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {a.student?.full_name ?? "Öğrenci"}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {dateStr} · {timeStr} · {a.duration_minutes} dk
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {dayLabel && (
                    <span className="rounded-full border border-[#4F7CFF]/30 bg-[#4F7CFF]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7AB3FF]">
                      {dayLabel}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isPending
                        ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                        : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isPending ? "Bekliyor" : "Onaylı"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── RecentStudentsPanel ─────────────────────────────────────────────────────
function RecentStudentsPanel({ students }: { students: RecentStudent[] }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-2xl border border-white/8 bg-slate-900/40 p-5 backdrop-blur-md duration-500 lg:col-span-2 [animation-delay:80ms]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B2FFF]/25 bg-[#7B2FFF]/15 text-[#A78BFF]">
            <GraduationCap className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Son Eklenen</h3>
        </div>
        <Link
          href="/dashboard/teacher/students"
          className="flex items-center gap-1 text-xs font-semibold text-[#A78BFF] transition-colors hover:text-white"
        >
          Tümü <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {students.length === 0 ? (
        <EmptyHint
          icon={<Users className="h-5 w-5 text-white/30" />}
          title="Henüz öğrenci yok"
          desc="Admin tarafından sana öğrenci atandığında burada görünecek."
        />
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const exam = gradeToExam(s.grade);
            const colors = targetExamColors(exam);
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/teacher/students/${s.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-all hover:border-white/10 hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] text-xs font-bold text-white">
                    {initialsFromName(s.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {s.full_name ?? "Öğrenci"}
                    </p>
                    <p className="truncate text-[11px] text-white/30">
                      {s.school ?? "Okul bilgisi yok"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
                  >
                    {exam ?? "—"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── EmptyHint ────────────────────────────────────────────────────────────────
function EmptyHint({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.02] px-4 py-6 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-0.5 max-w-xs text-xs text-white/40">{desc}</p>
    </div>
  );
}
