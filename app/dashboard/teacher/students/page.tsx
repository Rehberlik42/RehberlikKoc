import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  GraduationCap,
  BarChart2,
  CalendarDays,
  ChevronRight,
  Search,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  gradeToExam,
  initialsFromName,
  targetExamColors,
  targetExamLabel,
  timeAgo,
} from "@/lib/student-helpers";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentRow {
  student_id: string;
  assigned_at: string;
  student: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    grade: string | null;
    school: string | null;
    phone: string | null;
  } | null;
}

interface EnrichedStudent {
  id: string;
  fullName: string;
  grade: string | null;
  school: string | null;
  phone: string | null;
  avatarUrl: string | null;
  assignedAt: string;
  mockExamCount: number;
  sessionCount: number;
  lastActivity: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function TeacherStudentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");

  // ─── 1) Öğretmene atanmış aktif öğrenciler + profil bilgisi ────────────────
  const { data: rawRows } = await supabase
    .from("teacher_students")
    .select(
      `student_id, assigned_at,
       student:profiles!teacher_students_student_id_fkey(
         id, full_name, avatar_url, grade, school, phone
       )`
    )
    .eq("teacher_id", user.id)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  const rows = (rawRows ?? []) as unknown as StudentRow[];
  const studentIds = rows.map((r) => r.student_id);

  // ─── 2) Her öğrenci için ek metrikler (paralel) ────────────────────────────
  const [mockExamsRes, sessionsRes] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("mock_exams")
          .select("student_id")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as { student_id: string }[] }),
    studentIds.length > 0
      ? supabase
          .from("study_sessions")
          .select("student_id, study_date")
          .in("student_id", studentIds)
          .order("study_date", { ascending: false })
      : Promise.resolve({
          data: [] as { student_id: string; study_date: string }[],
        }),
  ]);

  const mockExamCounts = new Map<string, number>();
  for (const m of mockExamsRes.data ?? []) {
    mockExamCounts.set(
      m.student_id,
      (mockExamCounts.get(m.student_id) ?? 0) + 1
    );
  }

  const sessionCounts = new Map<string, number>();
  const lastActivityMap = new Map<string, string>();
  for (const s of sessionsRes.data ?? []) {
    sessionCounts.set(
      s.student_id,
      (sessionCounts.get(s.student_id) ?? 0) + 1
    );
    if (!lastActivityMap.has(s.student_id)) {
      // sessions zaten study_date DESC sıralı, ilk gördüğümüz = en güncel
      lastActivityMap.set(s.student_id, s.study_date);
    }
  }

  // ─── 3) Görüntü modeli ─────────────────────────────────────────────────────
  const students: EnrichedStudent[] = rows.map((r) => ({
    id: r.student_id,
    fullName: r.student?.full_name ?? "İsimsiz Öğrenci",
    grade: r.student?.grade ?? null,
    school: r.student?.school ?? null,
    phone: r.student?.phone ?? null,
    avatarUrl: r.student?.avatar_url ?? null,
    assignedAt: r.assigned_at,
    mockExamCount: mockExamCounts.get(r.student_id) ?? 0,
    sessionCount: sessionCounts.get(r.student_id) ?? 0,
    lastActivity: lastActivityMap.get(r.student_id) ?? null,
  }));

  // Hedef sınava göre kırılım (toolbar istatistikleri)
  const examBreakdown = students.reduce<Record<string, number>>((acc, s) => {
    const exam = gradeToExam(s.grade) ?? "Diğer";
    acc[exam] = (acc[exam] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2FFF]/15 border border-[#7B2FFF]/25 text-[#A78BFF] text-[10px] font-bold uppercase tracking-widest">
            <Users className="w-3 h-3" />
            Aktif Öğrenciler
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Öğrencilerim
          </h2>
          <p className="text-white/40 text-sm">
            Sana atanmış{" "}
            <span className="text-white font-semibold tabular-nums">
              {students.length}
            </span>{" "}
            öğrenciyi buradan yönetebilirsin.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              disabled
              className="pl-9 pr-3 py-2 rounded-lg bg-white/3 border border-white/8 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#7B2FFF]/40 focus:ring-2 focus:ring-[#7B2FFF]/20 disabled:opacity-50 disabled:cursor-not-allowed w-56"
            />
          </div>
          <button
            disabled
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] text-white text-sm font-semibold shadow-lg shadow-[#7B2FFF]/20 hover:shadow-[#7B2FFF]/30 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Yakında: yeni öğrenci ataması"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Öğrenci
          </button>
        </div>
      </div>

      {/* ─── Hedef sınav breakdown chips ────────────────────────────────── */}
      {students.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(examBreakdown).map(([exam, count]) => {
            const colors = targetExamColors(
              exam === "Diğer" ? null : (exam as ReturnType<typeof gradeToExam>)
            );
            return (
              <span
                key={exam}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.bg} ${colors.border} ${colors.text} text-xs font-semibold`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {exam}
                <span className="text-white/40 font-normal tabular-nums">
                  · {count}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* ─── Öğrenci kart grid ──────────────────────────────────────────── */}
      {students.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StudentCard ──────────────────────────────────────────────────────────────
function StudentCard({ student }: { student: EnrichedStudent }) {
  const exam = gradeToExam(student.grade);
  const colors = targetExamColors(exam);

  return (
    <div className="group relative rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md p-5 overflow-hidden hover:border-[#7B2FFF]/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#7B2FFF]/10 transition-all duration-300">
      {/* Decorative glow */}
      <div
        className="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, rgba(123,47,255,0.4) 0%, transparent 70%)",
        }}
      />

      {/* Üst: Avatar + isim + exam badge */}
      <div className="relative flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-sm font-black shrink-0 shadow-md shadow-[#7B2FFF]/25">
          {initialsFromName(student.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base leading-tight truncate">
            {student.fullName}
          </h3>
          <p className="text-white/40 text-xs mt-0.5 truncate flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3" />
            {student.school ?? "Okul belirtilmedi"}
          </p>
        </div>
      </div>

      {/* Hedef sınav badge */}
      <div className="relative mt-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colors.bg} ${colors.border} ${colors.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          {targetExamLabel(exam)}
          {student.grade && (
            <span className="text-white/40 font-normal">
              · {student.grade}. sınıf
            </span>
          )}
        </span>
      </div>

      {/* Mini stats */}
      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Stat
          icon={<BarChart2 className="w-3.5 h-3.5" />}
          label="Deneme"
          value={student.mockExamCount}
        />
        <Stat
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Çalışma"
          value={student.sessionCount}
        />
        <Stat
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          label="Son"
          value={student.lastActivity ? timeAgo(student.lastActivity) : "—"}
          isText
        />
      </div>

      {/* Footer: atama tarihi + CTA */}
      <div className="relative mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
        <p className="text-white/30 text-[11px]">
          {timeAgo(student.assignedAt)} atandı
        </p>
        <Link
          href={`/dashboard/teacher/students/${student.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-[#7B2FFF]/15 hover:border-[#7B2FFF]/30 hover:text-[#A78BFF] transition-colors"
        >
          Detayları Gör
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ─── Stat (mini) ──────────────────────────────────────────────────────────────
function Stat({
  icon,
  label,
  value,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/3 border border-white/5 px-2.5 py-2">
      <div className="flex items-center gap-1 text-white/40 text-[10px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p
        className={`text-white font-bold mt-0.5 truncate ${
          isText ? "text-xs" : "text-base tabular-nums"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 backdrop-blur-md p-12 text-center max-w-2xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#7B2FFF]/20 to-[#4F7CFF]/10 border border-[#7B2FFF]/20 flex items-center justify-center mb-4">
        <Users className="w-7 h-7 text-[#A78BFF]" />
      </div>
      <h3 className="text-white text-lg font-bold">Henüz öğrencin yok</h3>
      <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">
        Sana bir öğrenci atandığında burada listelenecek. Admin panelinden öğrenci
        ataması yapılabilir.
      </p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#7AB3FF] bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 px-3 py-1.5 rounded-full">
        <Sparkles className="w-3.5 h-3.5" />
        DORA Tavsiyesi: Atama sonrası ilk seansını planlamayı unutma!
      </div>
    </div>
  );
}
