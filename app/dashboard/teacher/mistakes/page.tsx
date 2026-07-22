import { redirect } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import CoachMistakeOverview from "./_components/CoachMistakeOverview";
import WeeklyStudentSummaryTable from "./_components/WeeklyStudentSummaryTable";
import {
  computeStudentMistakeSignals,
  computeSubjectLearningRates,
  computeWeeklyStudentSummaries,
  type RawMistakeEntry,
  type RawMistakeReview,
} from "./_components/mistake-analysis-utils";

export const dynamic = "force-dynamic";

export default async function TeacherMistakesOverviewPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");
  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: studentsRaw } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .order("full_name", { ascending: true });

  const students = (studentsRaw ?? []).map((s) => ({
    id: s.id as string,
    full_name: (s.full_name as string | null) ?? "",
  }));

  const studentIds = students.map((s) => s.id);

  let entries: RawMistakeEntry[] = [];
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("mistake_entries")
      .select(
        `id, student_id, subject_id, topic_id, cause_type, status,
         converted_from_dikkatsizlik, next_review_date, created_at,
         subject:subjects(name), topic:topics(name)`
      )
      .in("student_id", studentIds);

    entries = (data ?? []).map((row) => ({
      id: row.id as number,
      student_id: row.student_id as string,
      subject_id: row.subject_id as number,
      topic_id: (row.topic_id as number | null) ?? null,
      cause_type: row.cause_type as "dikkatsizlik" | "bilgi_eksigi",
      status: row.status as "aktif" | "tamamlandi",
      converted_from_dikkatsizlik:
        row.converted_from_dikkatsizlik === true,
      next_review_date: (row.next_review_date as string | null) ?? null,
      created_at: row.created_at as string,
      subject: row.subject as RawMistakeEntry["subject"],
      topic: row.topic as RawMistakeEntry["topic"],
    }));
  }

  const entryIds = entries.map((e) => e.id);
  let reviews: RawMistakeReview[] = [];
  if (entryIds.length > 0) {
    const { data } = await supabase
      .from("mistake_reviews")
      .select("id, mistake_entry_id, result, reviewed_at")
      .in("mistake_entry_id", entryIds);

    reviews = (data ?? []).map((row) => ({
      id: row.id as number,
      mistake_entry_id: row.mistake_entry_id as number,
      result: (row.result as "dogru" | "yanlis" | null) ?? null,
      reviewed_at: (row.reviewed_at as string | null) ?? null,
    }));
  }

  const today = new Date();
  const signals = computeStudentMistakeSignals(entries, students, today);
  const subjectRates = computeSubjectLearningRates(entries);
  const weeklySummaries = computeWeeklyStudentSummaries(
    entries,
    reviews,
    students,
    today
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
          <NotebookPen className="h-7 w-7 text-[var(--accent)]" />
          Hata Defteri Gözlem
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Tüm öğrencilerin tekrar, birikim ve öğrenme sinyallerine tek bakışta
          bak. Öğrenci adına tıklayarak detay sayfasına geçebilirsin.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center text-sm text-[var(--text-muted)]">
          Henüz bağlı öğrencin yok. Öğrenci ekledikten sonra burada sinyaller
          görünecek.
        </div>
      ) : (
        <>
          <CoachMistakeOverview
            signals={signals}
            subjectRates={subjectRates}
          />
          <WeeklyStudentSummaryTable summaries={weeklySummaries} />
        </>
      )}
    </div>
  );
}
