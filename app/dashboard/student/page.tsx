import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TodayTasks from "./_components/TodayTasks";
import TargetSummaryCard, {
  type TargetHighlight,
} from "./_components/TargetSummaryCard";
import {
  computeOverallTargetProgress,
  computeSubjectAnalysis,
  computeSubjectNetTrend,
  computeTargetProgress,
  filterExamsForAnalysis,
  normalizeAnalysisExams,
  type TargetProgress,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";
import {
  getDayLabelFull,
  mapStudyPlanTaskRow,
  STUDY_PLAN_TASK_SELECT,
  toISODate,
} from "./program/_components/plan-shared";

function pickHighlights(
  items: (TargetProgress & { subjectName: string })[]
): TargetHighlight[] {
  const withTarget = items.filter((i) => i.hasTarget);
  const unreached = withTarget.filter((i) => !i.reached);

  if (unreached.length === 0) {
    const reached = withTarget.filter((i) => i.reached).slice(0, 2);
    return reached.map((i) => ({
      subjectName: i.subjectName,
      remaining: i.remaining,
      reached: i.reached,
      status: i.status,
      trendDirection: i.trendDirection,
    }));
  }

  const closest = [...unreached].sort(
    (a, b) => (a.remaining ?? Infinity) - (b.remaining ?? Infinity)
  )[0];

  const drifting = unreached
    .filter((i) => i.status === "drifting")
    .sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0))[0];

  const furthest =
    drifting ??
    [...unreached]
      .filter((i) => i.subjectId !== closest?.subjectId)
      .sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0))[0];

  const picked: (TargetProgress & { subjectName: string })[] = [];
  if (closest) picked.push(closest);
  if (furthest && furthest.subjectId !== closest?.subjectId) picked.push(furthest);

  return picked.map((i) => ({
    subjectName: i.subjectName,
    remaining: i.remaining,
    reached: i.reached,
    status: i.status,
    trendDirection: i.trendDirection,
  }));
}

export default async function StudentDashboardPage() {
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

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  const today = new Date();
  const todayStr = toISODate(today);
  const todayDayName = getDayLabelFull(today);
  const todayDateLong = today.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [
    { data: todayTasksRaw },
    { data: rawStudentTargets },
    { data: rawMockExams },
    { data: rawSubjects },
  ] = await Promise.all([
    supabase
      .from("study_plan_tasks")
      .select(STUDY_PLAN_TASK_SELECT)
      .eq("student_id", user.id)
      .eq("plan_date", todayStr)
      .order("order_index", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("student_targets")
      .select("subject_id, target_net")
      .eq("student_id", user.id),
    supabase
      .from("mock_exams")
      .select(
        `id, exam_date, title,
         exam:exams(id, name),
         results:mock_exam_results(
           subject_id, correct_count, wrong_count, empty_count, net,
           subject:subjects(id, name, color)
         )`
      )
      .eq("student_id", user.id)
      .order("exam_date", { ascending: false })
      .limit(50),
    supabase.from("subjects").select("id, name").order("id"),
  ]);

  const initialTasks = (todayTasksRaw ?? []).map(mapStudyPlanTaskRow);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Öğrenci";

  const subjectNameById = new Map(
    (rawSubjects ?? []).map((s) => [s.id as number, s.name as string])
  );

  const existingTargets: Record<number, { target_net: number }> = {};
  for (const row of rawStudentTargets ?? []) {
    existingTargets[row.subject_id] = { target_net: Number(row.target_net) };
  }

  const analysisExams = normalizeAnalysisExams(
    (rawMockExams ?? []).map((m) => {
      const examRaw = m.exam as
        | { id: number; name: string }
        | { id: number; name: string }[]
        | null;
      const exam = Array.isArray(examRaw) ? (examRaw[0] ?? null) : examRaw;
      return {
        id: m.id as number,
        exam_date: m.exam_date as string,
        title: m.title as string | null,
        exam,
        results: (
          ((m.results ?? []) as unknown) as {
            subject_id: number;
            correct_count: number;
            wrong_count: number;
            empty_count: number;
            net: number | null;
            subject:
              | { id: number; name: string; color: string | null }
              | { id: number; name: string; color: string | null }[]
              | null;
          }[]
        ).map((r) => {
          const subjectRaw = r.subject;
          const subject = Array.isArray(subjectRaw) ? (subjectRaw[0] ?? null) : subjectRaw;
          return {
            subject_id: r.subject_id,
            correct_count: r.correct_count,
            wrong_count: r.wrong_count,
            empty_count: r.empty_count,
            net: r.net,
            subject,
          };
        }),
      };
    })
  );

  const filteredExams = filterExamsForAnalysis(analysisExams, "TYT+AYT", 5);
  const currentNets: Record<number, number> = Object.fromEntries(
    computeSubjectAnalysis(filteredExams, {}).map((row) => [row.subjectId, row.avgNet])
  );

  const targetSubjectIds = Object.keys(existingTargets).map(Number);
  const netSeriesBySubjectId: Record<number, number[]> = Object.fromEntries(
    targetSubjectIds.map((subjectId) => [
      subjectId,
      computeSubjectNetTrend(filteredExams, subjectId).netSeries,
    ])
  );

  const progressItems = targetSubjectIds.map((subjectId) => {
    const progress = computeTargetProgress({
      subjectId,
      currentNet: currentNets[subjectId] ?? null,
      targetNet: existingTargets[subjectId]?.target_net ?? null,
      netSeries: netSeriesBySubjectId[subjectId],
    });
    return {
      ...progress,
      subjectName: subjectNameById.get(subjectId) ?? "Ders",
    };
  });

  const overallProgress = computeOverallTargetProgress(progressItems);
  const highlights = pickHighlights(progressItems);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
          Merhaba, {firstName}! 👋
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Bugün planına sadık kal — her görev seni hedefine bir adım daha yaklaştırır.
        </p>
      </div>

      <TodayTasks
        initialTasks={initialTasks}
        todayDayName={todayDayName}
        todayDateLong={todayDateLong}
      />

      <TargetSummaryCard overall={overallProgress} highlights={highlights} />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 px-4 py-3 text-center text-xs text-[var(--text-muted)]">
        Unutma: Küçük adımlar büyük sonuçlar doğurur. Bugünkü görevlerini tamamlamak için
        kendine güven!
      </div>
    </div>
  );
}
