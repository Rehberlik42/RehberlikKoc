import { redirect } from "next/navigation";
import {
  HeartPulse,
  Sparkles,
  Brain,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { PsychologicalTest } from "@/lib/tests";
import TeacherTestsClient, {
  type TeacherTestResult,
} from "./_components/TeacherTestsClient";
import StatCard from "./_components/StatCard";

export const dynamic = "force-dynamic";

interface ResultRow {
  id: number;
  student_id: string;
  test_id: number;
  score: number | null;
  interpretation: string | null;
  answers: Record<string, number>;
  taken_at: string;
  student: {
    id: string;
    full_name: string | null;
    grade: string | null;
    avatar_url: string | null;
  } | null;
  test: {
    id: number;
    title: string;
    type: string;
    description: string | null;
    questions: PsychologicalTest["questions"];
  } | null;
}

export default async function TeacherTestsPage() {
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

  // ─── 1) Öğretmenin öğrencileri (profiles.teacher_id) ─────────────────────
  const { data: studentProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("teacher_id", user.id)
    .eq("role", "student");

  const studentIds = (studentProfiles ?? []).map((s) => s.id);

  // ─── 2) Bu öğrencilerin tüm test sonuçları (RLS zaten filtreler; ekstra
  //        .in() ile kesin sınırlandırıyoruz)
  let results: TeacherTestResult[] = [];
  if (studentIds.length > 0) {
    const { data: rawResults } = await supabase
      .from("test_results")
      .select(
        `id, student_id, test_id, score, interpretation, answers, taken_at,
         student:profiles!test_results_student_id_fkey(id, full_name, grade, avatar_url),
         test:psychological_tests!test_results_test_id_fkey(id, title, type, description, questions)`
      )
      .in("student_id", studentIds)
      .order("taken_at", { ascending: false });

    results = ((rawResults ?? []) as unknown as ResultRow[]).map((r) => ({
      id: r.id,
      score: r.score,
      interpretation: r.interpretation,
      answers: (r.answers ?? {}) as Record<string, number>,
      takenAt: r.taken_at,
      student: r.student,
      test: r.test,
    }));
  }

  // ─── 3) Özet metrikler ────────────────────────────────────────────────────
  const totalResults = results.length;
  const uniqueStudents = new Set(results.map((r) => r.student?.id ?? ""))
    .size;
  const lastSevenDays = results.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return Date.now() - t < 7 * 24 * 3600 * 1000;
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary-2)]/15 border border-[var(--primary-2)]/25 text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          Öğrenci envanter takibi
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <HeartPulse className="w-7 h-7 text-[var(--accent)]" />
          Test ve Envanter Sonuçları
        </h2>
        <p className="text-[var(--text-muted)] text-sm max-w-2xl">
          Öğrencilerinin tamamladığı tüm bilimsel testlerin sonuçları, kaygı/
          motivasyon/odak seviyeleri ve DORA önerileri tek ekranda.
        </p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: <HeartPulse className="h-5 w-5" />,
            label: "Toplam çözülen test",
            value: totalResults,
            glow: "rgba(123,47,255,0.3)",
          },
          {
            icon: <Users className="h-5 w-5" />,
            label: "Test çözen öğrenci",
            value: uniqueStudents,
            glow: "rgba(79,124,255,0.3)",
          },
          {
            icon: <Brain className="h-5 w-5" />,
            label: "Son 7 günde",
            value: lastSevenDays,
            glow: "rgba(0,212,255,0.3)",
          },
        ].map((card, index) => (
          <div
            key={card.label}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <StatCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              glow={card.glow}
            />
          </div>
        ))}
      </div>

      {/* Sonuç tablosu / akordeon */}
      <TeacherTestsClient
        results={results}
        hasStudents={studentIds.length > 0}
      />
    </div>
  );
}

