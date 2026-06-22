import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResourcesClient from "@/app/dashboard/teacher/resources/_components/ResourcesClient";
import {
  calcCompletionPct,
  type ExamOption,
  type StudyResource,
  type SubjectOption,
} from "@/app/dashboard/teacher/resources/_components/resource-types";

export const dynamic = "force-dynamic";

interface ResourceProgressTotals {
  solved: number;
  correct: number;
  wrong: number;
}

function groupProgressByResource(
  rows: {
    study_resource_id: number | string;
    solved_count: number | null;
    correct_count: number | null;
    wrong_count: number | null;
  }[]
): Map<string, ResourceProgressTotals> {
  const map = new Map<string, ResourceProgressTotals>();

  for (const row of rows) {
    const key = String(row.study_resource_id);
    const current = map.get(key) ?? { solved: 0, correct: 0, wrong: 0 };
    current.solved += row.solved_count ?? 0;
    current.correct += row.correct_count ?? 0;
    current.wrong += row.wrong_count ?? 0;
    map.set(key, current);
  }

  return map;
}

function mapResource(
  row: {
    id: string | number;
    name: string;
    publisher: string | null;
    cover_color: string | null;
    order_index: number;
    exam: { name: string } | { name: string }[] | null;
    subject: { name: string; color: string | null } | { name: string; color: string | null }[] | null;
    topics: { id: number; target_count: number }[] | null;
  },
  progress?: ResourceProgressTotals
): StudyResource {
  const examRaw = row.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topics = row.topics ?? [];
  const topicCount = topics.length;
  const totalQuestions = topics.reduce((sum, t) => sum + (t.target_count ?? 0), 0);

  const solvedTotal = progress?.solved ?? 0;
  const correctTotal = progress?.correct ?? 0;
  const wrongTotal = progress?.wrong ?? 0;
  const completionPct = calcCompletionPct(solvedTotal, totalQuestions);

  return {
    id: String(row.id),
    name: row.name,
    publisher: row.publisher,
    cover_color: row.cover_color ?? "#2B4C8C",
    order_index: row.order_index,
    exam: exam as { name: string } | null,
    subject: subject as { name: string; color: string | null } | null,
    topicCount,
    totalQuestions,
    solvedTotal,
    correctTotal,
    wrongTotal,
    completionPct,
  };
}

export default async function TeacherResourcesPage() {
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

  const [resourcesRes, examsRes, subjectsRes, progressRes] = await Promise.all([
    supabase
      .from("study_resources")
      .select(
        "id, name, publisher, cover_color, order_index, exam:exams(name), subject:subjects(name, color), topics:study_resource_topics(id, target_count)"
      )
      .eq("teacher_id", user.id)
      .order("order_index", { ascending: true }),
    supabase.from("exams").select("id, name").order("name"),
    supabase
      .from("subjects")
      .select("id, name, exam_id, exam:exams(name)")
      .order("order_index"),
    supabase
      .from("study_plan_tasks")
      .select("study_resource_id, solved_count, correct_count, wrong_count")
      .eq("is_completed", true)
      .not("study_resource_id", "is", null)
      .not("solved_count", "is", null),
  ]);

  const progressByResource = groupProgressByResource(progressRes.data ?? []);

  const initialResources: StudyResource[] = (resourcesRes.data ?? []).map((row) =>
    mapResource(
      row as Parameters<typeof mapResource>[0],
      progressByResource.get(String(row.id))
    )
  );

  const examOptions: ExamOption[] = (examsRes.data ?? []).map((e) => ({
    id: e.id,
    name: e.name,
  }));

  const subjectOptions: SubjectOption[] = (subjectsRes.data ?? []).map((s) => {
    const examRaw = s.exam;
    const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
    return {
      id: s.id,
      name: s.name,
      exam_id: s.exam_id,
      examName:
        exam && typeof exam === "object" && "name" in exam
          ? (exam.name as string)
          : null,
    };
  });

  return (
    <ResourcesClient
      teacherId={user.id}
      initialResources={initialResources}
      examOptions={examOptions}
      subjectOptions={subjectOptions}
    />
  );
}
