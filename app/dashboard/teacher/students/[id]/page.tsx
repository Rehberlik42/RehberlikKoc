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
import MetricCard from "./_components/MetricCard";
import StudentNetChart, {
  type NetChartPoint,
} from "./_components/StudentNetChart";
import StudentSessionsList, {
  type StudentSessionRow,
} from "./_components/StudentSessionsList";
import TeacherTopicProgress, {
  type TeacherTopicProgressSubject,
} from "./_components/TeacherTopicProgress";
import StudentDetailTabs from "./_components/StudentDetailTabs";
import TeacherWeeklyPlan from "./_components/TeacherWeeklyPlan";
import ExamAnalysis from "./_components/ExamAnalysis";
import StudentTargets from "./_components/StudentTargets";
import {
  computeSubjectAnalysis,
  computeSubjectNetTrend,
  filterExamsForAnalysis,
  normalizeAnalysisExams,
  type NormalizedExam,
} from "./_components/exam-analysis-utils";
import type { ProgressStatus } from "@/app/dashboard/student/progress/_components/TopicRow";

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

  // ─── Hızlı metrikler + performans verileri (paralel) ───────────────────
  const [
    { count: mockCount },
    { count: sessionCount },
    { count: appointmentCount },
    { data: rawMockExams },
    { data: rawAnalysisExams },
    { data: rawSessions },
    { data: rawSubjects },
    { data: rawExams },
    { data: progressRecords },
    { data: rawStudentTargets },
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
    supabase
      .from("mock_exams")
      .select(
        "id, exam_date, title, exam:exams(name), results:mock_exam_results(net)"
      )
      .eq("student_id", id)
      .order("exam_date", { ascending: true })
      .limit(30),
    supabase
      .from("mock_exams")
      .select(
        "id, exam_date, title, exam:exams(id, name), results:mock_exam_results(subject_id, correct_count, wrong_count, empty_count, net, subject:subjects(id, name, color))"
      )
      .eq("student_id", id)
      .order("exam_date", { ascending: false })
      .limit(50),
    supabase
      .from("study_sessions")
      .select(
        "id, study_date, correct_count, wrong_count, duration_minutes, subject:subjects(name, color)"
      )
      .eq("student_id", id)
      .order("study_date", { ascending: false })
      .limit(10),
    supabase
      .from("subjects")
      .select(
        "id, name, color, order_index, exam_id, exam:exams(name), topics(id, name, order_index)"
      )
      .order("order_index"),
    supabase
      .from("exams")
      .select("id, name, description")
      .eq("is_active", true)
      .order("id"),
    supabase
      .from("topic_progress")
      .select("topic_id, status, completion_percentage")
      .eq("student_id", id),
    supabase
      .from("student_targets")
      .select("subject_id, target_net, note")
      .eq("student_id", id),
  ]);

  const chartData: NetChartPoint[] = (rawMockExams ?? []).map((m) => {
    const results = Array.isArray(m.results) ? m.results : [];
    const net = results.reduce(
      (sum: number, r: { net?: number | null }) => sum + Number(r.net ?? 0),
      0
    );
    const examVal = Array.isArray(m.exam) ? m.exam[0] : m.exam;
    return {
      date: new Date(m.exam_date).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      }),
      net: Number(net.toFixed(2)),
      title: m.title ?? undefined,
      examName:
        examVal && typeof examVal === "object" && "name" in examVal
          ? (examVal.name as string)
          : undefined,
      fullDate: m.exam_date,
    };
  });

  const sessions: StudentSessionRow[] = (rawSessions ?? []).map((row) => {
    const subjectRaw = row.subject;
    const subject = Array.isArray(subjectRaw)
      ? subjectRaw[0] ?? null
      : subjectRaw;
    return {
      id: row.id,
      study_date: row.study_date,
      correct_count: row.correct_count,
      wrong_count: row.wrong_count,
      duration_minutes: row.duration_minutes,
      subject: subject
        ? {
            name: subject.name,
            color: subject.color ?? null,
          }
        : null,
    };
  });

  const progressByTopic = new Map<
    number,
    { status: ProgressStatus; completion_percentage: number }
  >();
  (progressRecords ?? []).forEach((p) => {
    progressByTopic.set(p.topic_id, {
      status: p.status as ProgressStatus,
      completion_percentage: p.completion_percentage,
    });
  });

  const subjects: TeacherTopicProgressSubject[] = (rawSubjects ?? []).map(
    (s) => {
      const topicsArr = Array.isArray(s.topics) ? s.topics : [];
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        topics: topicsArr
          .sort(
            (a: { order_index: number }, b: { order_index: number }) =>
              a.order_index - b.order_index
          )
          .map((t: { id: number; name: string }) => {
            const prog = progressByTopic.get(t.id);
            return {
              id: t.id,
              name: t.name,
              progress: prog
                ? {
                    status: prog.status,
                    completion_percentage: prog.completion_percentage,
                  }
                : null,
            };
          }),
      };
    }
  );

  const programSubjects = (rawSubjects ?? []).map((s) => {
    const topicsArr = Array.isArray(s.topics) ? s.topics : [];
    const examRaw = s.exam as { name: string } | { name: string }[] | null;
    const examName = Array.isArray(examRaw)
      ? (examRaw[0]?.name ?? null)
      : examRaw?.name ?? null;
    return {
      id: s.id,
      name: s.name,
      exam: examName,
      topics: topicsArr
        .sort(
          (a: { order_index: number }, b: { order_index: number }) =>
            a.order_index - b.order_index
        )
        .map((t: { id: number; name: string }) => ({
          id: t.id,
          name: t.name,
        })),
    };
  });

  const analysisExams: NormalizedExam[] = normalizeAnalysisExams(
    (rawAnalysisExams ?? []) as Parameters<typeof normalizeAnalysisExams>[0]
  );

  const analysisExamOptions = Array.from(
    new Map(
      analysisExams
        .filter((e) => e.examId > 0)
        .map((e) => [e.examId, { id: e.examId, name: e.examName }])
    ).values()
  );

  const topicCountBySubjectId = Object.fromEntries(
    (rawSubjects ?? []).map((s) => [
      s.id,
      (Array.isArray(s.topics) ? s.topics : []).length,
    ])
  );

  const examFormOptions = (rawExams ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description ?? null,
  }));

  const subjectFormOptions = (rawSubjects ?? []).map((s) => {
    const examRaw = s.exam as { name: string } | { name: string }[] | null;
    const examName = Array.isArray(examRaw)
      ? (examRaw[0]?.name ?? null)
      : (examRaw?.name ?? null);
    return {
      id: s.id,
      name: s.name,
      exam_id: s.exam_id as number | null,
      order_index: s.order_index,
      color: s.color,
      exam: examName ? { name: examName } : null,
    };
  });

  const existingTargets: Record<
    number,
    { target_net: number; note: string | null }
  > = {};
  for (const row of rawStudentTargets ?? []) {
    existingTargets[row.subject_id] = {
      target_net: Number(row.target_net),
      note: row.note,
    };
  }

  const filteredExamsForNets = filterExamsForAnalysis(
    analysisExams,
    "TYT+AYT",
    5
  );
  const currentNets: Record<number, number> = Object.fromEntries(
    computeSubjectAnalysis(filteredExamsForNets, topicCountBySubjectId).map(
      (row) => [row.subjectId, row.avgNet]
    )
  );

  const netSeriesBySubjectId: Record<number, number[]> = Object.fromEntries(
    subjectFormOptions.map((subject) => [
      subject.id,
      computeSubjectNetTrend(filteredExamsForNets, subject.id).netSeries,
    ])
  );

  const exam = gradeToExam(student.grade);
  const colors = targetExamColors(exam);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Geri linki */}
      <Link
        href="/dashboard/teacher/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Tüm öğrenciler
      </Link>

      {/* Profil kartı */}
      <div className="relative animate-in fade-in slide-in-from-bottom-4 fill-mode-both overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] p-6 duration-500 md:p-8">
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
              className="h-20 w-20 shrink-0 rounded-2xl border border-[var(--border)] object-cover shadow-lg shadow-[var(--primary)]/25"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-2xl font-black text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/30">
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
            <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
              {student.full_name ?? "İsimsiz Öğrenci"}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
              {student.grade && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {student.grade}. sınıf
                </span>
              )}
              {student.school && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {student.school}
                </span>
              )}
              {student.phone && (
                <a
                  href={`tel:${student.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-[var(--accent)]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  {student.phone}
                </a>
              )}
            </div>
            {student.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {student.bio}
              </p>
            )}
            {student.created_at ? (
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                {timeAgo(student.created_at)} eklendi
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <StudentDetailTabs
        overview={
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <BarChart2 className="h-5 w-5" />,
                  label: "Toplam Deneme",
                  value: mockCount ?? 0,
                  accent: "text-[var(--accent)]",
                },
                {
                  icon: <Sparkles className="h-5 w-5" />,
                  label: "Çalışma Oturumu",
                  value: sessionCount ?? 0,
                  accent: "text-[var(--primary-2)]",
                },
                {
                  icon: <Calendar className="h-5 w-5" />,
                  label: "Ortak Randevu",
                  value: appointmentCount ?? 0,
                  accent: "text-[var(--primary-3)]",
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

            <div className="mt-6 space-y-6">
              <StudentNetChart data={chartData} />
              <TeacherTopicProgress studentId={id} subjects={subjects} />
              <StudentSessionsList sessions={sessions} />
            </div>
          </>
        }
        program={
          <TeacherWeeklyPlan studentId={id} subjects={programSubjects} />
        }
        analysis={
          <ExamAnalysis
            studentId={id}
            exams={analysisExamOptions}
            analysisExams={analysisExams}
            topicCountBySubjectId={topicCountBySubjectId}
            examFormOptions={examFormOptions}
            subjectFormOptions={subjectFormOptions}
          />
        }
        targets={
          <StudentTargets
            studentId={id}
            subjects={subjectFormOptions}
            currentNets={currentNets}
            netSeriesBySubjectId={netSeriesBySubjectId}
            existingTargets={existingTargets}
          />
        }
      />
    </div>
  );
}
