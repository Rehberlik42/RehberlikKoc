import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  CalendarClock,
  ClipboardList,
  ArrowRight,
  Sparkles,
  GraduationCap,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  gradeToExam,
  initialsFromName,
  targetExamColors,
} from "@/lib/student-helpers";

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
  student_id: string;
  assigned_at: string;
  student: {
    id: string;
    full_name: string | null;
    grade: string | null;
    school: string | null;
  } | null;
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

  // ─── Sayim sorgulari (head: true → veri taşımaz, sadece count) ─────────────
  const [
    { count: studentCount },
    { count: pendingAppointmentsCount },
    { count: testResultsCount },
  ] = await Promise.all([
    supabase
      .from("teacher_students")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("status", "pending"),
    // test_results: RLS sayesinde sadece öğretmenin atadığı öğrencilerin testleri sayılır
    supabase
      .from("test_results")
      .select("*", { count: "exact", head: true }),
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

  // ─── Son atanan öğrenciler (en fazla 4) ─────────────────────────────────
  const { data: rawRecentStudents } = await supabase
    .from("teacher_students")
    .select(
      `student_id, assigned_at,
       student:profiles!teacher_students_student_id_fkey(id, full_name, grade, school)`
    )
    .eq("teacher_id", user.id)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false })
    .limit(4);

  const recentStudents =
    (rawRecentStudents ?? []) as unknown as RecentStudent[];

  const hour = new Date().getHours();
  const salut =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4F7CFF]/15 border border-[#4F7CFF]/25 text-[#7AB3FF] text-[10px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          MINDORA · Koçluk
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Eğitim Koçu Kontrol Paneli
        </h2>
        <p className="text-white/40 text-sm">
          {salut}, {profile?.full_name ?? "Öğretmen"}. Bugün öğrencilerinin
          ilerlemesine göz atalım.
        </p>
      </div>

      {/* ─── 3 özet kart ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Aktif Öğrencilerim"
          value={studentCount ?? 0}
          sub="Bana atanmış öğrenciler"
          href="/dashboard/teacher/students"
          ctaLabel="Listeyi gör"
          glow="radial-gradient(circle, rgba(123,47,255,0.35) 0%, transparent 70%)"
          accent="text-[#A78BFF]"
        />
        <SummaryCard
          icon={<CalendarClock className="w-5 h-5" />}
          label="Bekleyen Randevular"
          value={pendingAppointmentsCount ?? 0}
          sub="Onayını bekleyen seanslar"
          href="/dashboard/teacher/appointments"
          ctaLabel="Randevulara git"
          glow="radial-gradient(circle, rgba(79,124,255,0.35) 0%, transparent 70%)"
          accent="text-[#7AB3FF]"
        />
        <SummaryCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="İncelenecek Testler"
          value={testResultsCount ?? 0}
          sub="Öğrencilerinin test sonuçları"
          href="/dashboard/teacher/reports"
          ctaLabel="Raporları aç"
          glow="radial-gradient(circle, rgba(0,212,255,0.35) 0%, transparent 70%)"
          accent="text-[#70E6FF]"
        />
      </div>

      {/* ─── Alt grid: yaklaşan randevular + son atanan öğrenciler ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <UpcomingPanel appointments={upcomingAppointments} />
        <RecentStudentsPanel students={recentStudents} />
      </div>
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({
  icon,
  label,
  value,
  sub,
  href,
  ctaLabel,
  glow,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  href: string;
  ctaLabel: string;
  glow: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md p-5 overflow-hidden hover:border-white/15 hover:-translate-y-0.5 transition-all duration-300 block"
    >
      <div
        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className="text-white text-3xl font-black tabular-nums">{value}</p>
          <p className="text-white/30 text-xs mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl border border-white/10 bg-white/4 flex items-center justify-center shrink-0 ${accent}`}>
          {icon}
        </div>
      </div>

      <div className="relative mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-white/40 font-medium">{ctaLabel}</span>
        <ArrowRight className={`w-3.5 h-3.5 ${accent} transition-transform group-hover:translate-x-0.5`} />
      </div>
    </Link>
  );
}

// ─── UpcomingPanel ────────────────────────────────────────────────────────────
function UpcomingPanel({
  appointments,
}: {
  appointments: UpcomingAppointment[];
}) {
  return (
    <div className="lg:col-span-3 rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4F7CFF]/15 border border-[#4F7CFF]/25 flex items-center justify-center text-[#7AB3FF]">
            <CalendarDays className="w-4 h-4" />
          </div>
          <h3 className="text-white text-sm font-bold">Yaklaşan Randevular</h3>
        </div>
        <Link
          href="/dashboard/teacher/appointments"
          className="text-[#7AB3FF] hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          Tümü <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <EmptyHint
          icon={<CalendarClock className="w-5 h-5 text-white/30" />}
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
            return (
              <li
                key={a.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0d0d2b] border border-white/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white/40 leading-none">
                    {date.toLocaleDateString("tr-TR", { month: "short" }).toUpperCase()}
                  </span>
                  <span className="text-white text-sm font-black leading-tight">
                    {date.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {a.student?.full_name ?? "Öğrenci"}
                  </p>
                  <p className="text-white/40 text-[11px]">
                    {dateStr} · {timeStr} · {a.duration_minutes} dk
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isPending
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {isPending ? "Bekliyor" : "Onaylı"}
                </span>
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
    <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7B2FFF]/15 border border-[#7B2FFF]/25 flex items-center justify-center text-[#A78BFF]">
            <GraduationCap className="w-4 h-4" />
          </div>
          <h3 className="text-white text-sm font-bold">Son Eklenen</h3>
        </div>
        <Link
          href="/dashboard/teacher/students"
          className="text-[#A78BFF] hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          Tümü <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {students.length === 0 ? (
        <EmptyHint
          icon={<Users className="w-5 h-5 text-white/30" />}
          title="Henüz öğrenci yok"
          desc="Admin tarafından sana öğrenci atandığında burada görünecek."
        />
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const exam = gradeToExam(s.student?.grade);
            const colors = targetExamColors(exam);
            return (
              <li
                key={s.student_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initialsFromName(s.student?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {s.student?.full_name ?? "Öğrenci"}
                  </p>
                  <p className="text-white/30 text-[11px] truncate">
                    {s.student?.school ?? "Okul bilgisi yok"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors.bg} ${colors.border} ${colors.text}`}
                >
                  {exam ?? "—"}
                </span>
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
    <div className="rounded-xl border border-dashed border-white/8 bg-white/2 px-4 py-6 text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-white text-sm font-semibold">{title}</p>
      <p className="text-white/40 text-xs mt-0.5 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
