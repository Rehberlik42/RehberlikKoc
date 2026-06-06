import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Phone,
  Calendar,
  BarChart2,
  BookOpen,
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

interface StudentDetail {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
  school: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string | null;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // ─── Bu öğrenci bu öğretmene ait mi? ─────────────────────────────────────
  const { data: rawStudent } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, grade, school, phone, bio, created_at")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .maybeSingle();

  if (!rawStudent) notFound();
  const student = rawStudent as unknown as StudentDetail;

  // ─── Hızlı metrikler (paralel) ──────────────────────────────────────────
  const [
    { count: mockCount },
    { count: sessionCount },
    { count: appointmentCount },
  ] = await Promise.all([
    supabase
      .from("mock_exams")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id),
    supabase
      .from("study_sessions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", user.id)
      .eq("student_id", id),
  ]);

  const exam = gradeToExam(student.grade);
  const colors = targetExamColors(exam);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Geri linki */}
      <Link
        href="/dashboard/teacher/students"
        className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tüm öğrenciler
      </Link>

      {/* Profil kartı */}
      <div className="relative rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] p-6 md:p-8 overflow-hidden">
        <div
          className="absolute -right-20 -top-20 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(123,47,255,0.5) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg shadow-[#7B2FFF]/30">
            {initialsFromName(student.full_name)}
          </div>

          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${colors.bg} ${colors.border} ${colors.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {targetExamLabel(exam)}
            </span>
            <h1 className="text-white text-2xl sm:text-3xl font-black mt-2">
              {student.full_name ?? "İsimsiz Öğrenci"}
            </h1>
            <div className="flex items-center gap-4 text-white/40 text-sm mt-2 flex-wrap">
              {student.grade && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  {student.grade}. sınıf
                </span>
              )}
              {student.school && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {student.school}
                </span>
              )}
              {student.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  {student.phone}
                </span>
              )}
            </div>
            {student.bio && (
              <p className="text-white/60 text-sm mt-3 max-w-2xl leading-relaxed">
                {student.bio}
              </p>
            )}
            {student.created_at ? (
              <p className="text-white/30 text-xs mt-3">
                {timeAgo(student.created_at)} eklendi
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hızlı metrikler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<BarChart2 className="w-5 h-5" />}
          label="Toplam Deneme"
          value={mockCount ?? 0}
          accent="text-[#A78BFF]"
        />
        <MetricCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Çalışma Oturumu"
          value={sessionCount ?? 0}
          accent="text-[#7AB3FF]"
        />
        <MetricCard
          icon={<Calendar className="w-5 h-5" />}
          label="Ortak Randevu"
          value={appointmentCount ?? 0}
          accent="text-[#70E6FF]"
        />
      </div>

      {/* Geliştirilecek alanlar */}
      <div className="rounded-2xl border border-[#4F7CFF]/20 bg-gradient-to-br from-[#4F7CFF]/10 to-transparent p-5 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#7AB3FF] shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-semibold text-sm">
            Detaylı analiz yakında geliyor
          </p>
          <p className="text-white/40 text-xs mt-1">
            Bu sayfada ileride öğrencinin deneme grafikleri, konu ilerlemesi,
            seans notları ve birebir mesajlaşma yer alacak.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </p>
        <div className={`w-9 h-9 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-white text-3xl font-black tabular-nums">{value}</p>
    </div>
  );
}