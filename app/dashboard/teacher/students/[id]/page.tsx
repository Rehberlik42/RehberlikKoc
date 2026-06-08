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
  MessageCircle,
  StickyNote,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  gradeToExam,
  initialsFromName,
  targetExamColors,
  targetExamLabel,
  timeAgo,
} from "@/lib/student-helpers";
import MetricCard from "./_components/MetricCard";

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

const COMING_SOON_FEATURES = [
  { icon: BarChart2, label: "Deneme grafikleri" },
  { icon: TrendingUp, label: "Konu ilerlemesi" },
  { icon: StickyNote, label: "Seans notları" },
  { icon: MessageCircle, label: "Birebir mesajlaşma" },
] as const;

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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Geri linki */}
      <Link
        href="/dashboard/teacher/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/40 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Tüm öğrenciler
      </Link>

      {/* Profil kartı */}
      <div className="relative animate-in fade-in slide-in-from-bottom-4 fill-mode-both overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] p-6 duration-500 md:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-60 blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(123,47,255,0.55) 0%, rgba(79,124,255,0.2) 45%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-wrap items-start gap-5">
          {student.avatar_url ? (
            <img
              src={student.avatar_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover shadow-lg shadow-[#7B2FFF]/25"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] text-2xl font-black text-white shadow-lg shadow-[#7B2FFF]/30">
              {initialsFromName(student.full_name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${colors.bg} ${colors.border} ${colors.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {targetExamLabel(exam)}
            </span>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {student.full_name ?? "İsimsiz Öğrenci"}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/45">
              {student.grade && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 shrink-0 text-white/35" />
                  {student.grade}. sınıf
                </span>
              )}
              {student.school && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-white/35" />
                  {student.school}
                </span>
              )}
              {student.phone && (
                <a
                  href={`tel:${student.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-[#A78BFF]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-white/35" />
                  {student.phone}
                </a>
              )}
            </div>
            {student.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                {student.bio}
              </p>
            )}
            {student.created_at ? (
              <p className="mt-3 text-xs text-white/30">
                {timeAgo(student.created_at)} eklendi
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hızlı metrikler */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: <BarChart2 className="h-5 w-5" />,
            label: "Toplam Deneme",
            value: mockCount ?? 0,
            accent: "text-[#A78BFF]",
          },
          {
            icon: <Sparkles className="h-5 w-5" />,
            label: "Çalışma Oturumu",
            value: sessionCount ?? 0,
            accent: "text-[#7AB3FF]",
          },
          {
            icon: <Calendar className="h-5 w-5" />,
            label: "Ortak Randevu",
            value: appointmentCount ?? 0,
            accent: "text-[#70E6FF]",
          },
        ].map((card, index) => (
          <div
            key={card.label}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <MetricCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              accent={card.accent}
            />
          </div>
        ))}
      </div>

      {/* Geliştirilecek alanlar */}
      <div className="relative overflow-hidden rounded-2xl border border-[#4F7CFF]/25 bg-gradient-to-br from-[#4F7CFF]/12 via-[#0d0d2b]/40 to-transparent p-5 md:p-6">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7B2FFF]/15 blur-[50px]"
          aria-hidden
        />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#4F7CFF]/30 bg-[#4F7CFF]/15">
            <Sparkles className="h-5 w-5 text-[#7AB3FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Detaylı analiz yakında geliyor
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/40">
              Bu sayfada ileride öğrencinin deneme grafikleri, konu ilerlemesi,
              seans notları ve birebir mesajlaşma yer alacak.
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COMING_SOON_FEATURES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-white/55"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#7AB3FF]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
