import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentResourcesClient, {
  type StudentAssignedResource,
} from "./_components/StudentResourcesClient";

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

function calcCompletionPct(solved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((solved / target) * 100));
}

function mapAssignment(
  row: {
    id: string;
    note: string | null;
    study_resource:
      | {
          id: string | number;
          name: string;
          publisher: string | null;
          cover_color: string | null;
          exam: { name: string } | { name: string }[] | null;
          subject: { name: string; color: string | null } | { name: string; color: string | null }[] | null;
          topics: { id: number; target_count: number }[] | null;
        }
      | {
          id: string | number;
          name: string;
          publisher: string | null;
          cover_color: string | null;
          exam: { name: string } | { name: string }[] | null;
          subject: { name: string; color: string | null } | { name: string; color: string | null }[] | null;
          topics: { id: number; target_count: number }[] | null;
        }[]
      | null;
  },
  progress?: ResourceProgressTotals
): StudentAssignedResource | null {
  const srRaw = row.study_resource;
  const sr = Array.isArray(srRaw) ? srRaw[0] ?? null : srRaw;
  if (!sr) return null;

  const examRaw = sr.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = sr.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topics = sr.topics ?? [];
  const topicCount = topics.length;
  const totalQuestions = topics.reduce((sum, t) => sum + (t.target_count ?? 0), 0);

  const solvedTotal = progress?.solved ?? 0;
  const correctTotal = progress?.correct ?? 0;
  const wrongTotal = progress?.wrong ?? 0;

  return {
    assignmentId: row.id,
    note: row.note,
    id: String(sr.id),
    name: sr.name,
    publisher: sr.publisher,
    cover_color: sr.cover_color ?? "#2B4C8C",
    exam: exam as { name: string } | null,
    subject: subject as { name: string; color: string | null } | null,
    topicCount,
    totalQuestions,
    solvedTotal,
    correctTotal,
    wrongTotal,
    completionPct: calcCompletionPct(solvedTotal, totalQuestions),
  };
}

function getResourceIdFromAssignment(row: {
  study_resource:
    | { id: string | number }
    | { id: string | number }[]
    | null;
}): string | null {
  const srRaw = row.study_resource;
  const sr = Array.isArray(srRaw) ? srRaw[0] ?? null : srRaw;
  return sr ? String(sr.id) : null;
}

export default async function StudentResourcesPage() {
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

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  const [assignmentsRes, progressRes] = await Promise.all([
    supabase
      .from("resource_assignments")
      .select(
        `id, note, study_resource:study_resources(id, name, publisher, cover_color, exam:exams(name), subject:subjects(name, color), topics:study_resource_topics(id, target_count))`
      )
      .eq("student_id", user.id),
    supabase
      .from("study_plan_tasks")
      .select("study_resource_id, solved_count, correct_count, wrong_count")
      .eq("student_id", user.id)
      .eq("is_completed", true)
      .not("study_resource_id", "is", null)
      .not("solved_count", "is", null),
  ]);

  const progressByResource = groupProgressByResource(progressRes.data ?? []);

  const initialResources: StudentAssignedResource[] = (assignmentsRes.data ?? [])
    .map((row) => {
      const resourceId = getResourceIdFromAssignment(
        row as Parameters<typeof getResourceIdFromAssignment>[0]
      );
      return mapAssignment(
        row as Parameters<typeof mapAssignment>[0],
        resourceId ? progressByResource.get(resourceId) : undefined
      );
    })
    .filter((r): r is StudentAssignedResource => r != null)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <StudentResourcesClient initialResources={initialResources} studentId={user.id} />
  );
}
