import { redirect } from "next/navigation";
import { BookX } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import MistakeQuickAddForm from "./_components/MistakeQuickAddForm";
import MistakeEntriesList, {
  type MistakeListEntry,
} from "./_components/MistakeEntriesList";
import type {
  MistakeCauseType,
  MistakeResourceOption,
  MistakeSubjectOption,
} from "./_components/mistake-types";

export const dynamic = "force-dynamic";

function oneName(
  raw: { name: string } | { name: string }[] | null | undefined
): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v?.name ?? null;
}

export default async function StudentMistakesPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  const teacherId = (profile?.teacher_id as string | null) ?? null;

  const [subjectsRes, assignmentsRes, entriesRes] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, name, color, order_index, exam_id, exam:exams(name), topics(id, name, order_index, parent_id)"
      )
      .order("order_index"),
    supabase
      .from("resource_assignments")
      .select(`study_resource:study_resources!inner(id, name, is_active)`)
      .eq("student_id", user.id)
      .eq("study_resource.is_active", true),
    supabase
      .from("mistake_entries")
      .select(
        `id, resource_label, test_label, question_number, cause_type, status,
         solved_date, created_at,
         subject:subjects(name), topic:topics(name),
         study_resource:study_resources(name)`
      )
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const subjects: MistakeSubjectOption[] = (subjectsRes.data ?? []).map((s) => {
    const examRaw = s.exam;
    const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
    const topicsRaw = s.topics;
    const topics = Array.isArray(topicsRaw) ? topicsRaw : [];
    return {
      id: s.id,
      name: s.name,
      exam_id: s.exam_id,
      examName:
        exam && typeof exam === "object" && "name" in exam
          ? (exam.name as string)
          : null,
      color: s.color ?? null,
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        order_index: t.order_index ?? null,
        parent_id: t.parent_id ?? null,
      })),
    };
  });

  const resourceMap = new Map<number, MistakeResourceOption>();
  for (const row of assignmentsRes.data ?? []) {
    const srRaw = row.study_resource;
    const sr = Array.isArray(srRaw) ? srRaw[0] ?? null : srRaw;
    if (!sr) continue;
    const id = Number(sr.id);
    if (!resourceMap.has(id)) {
      resourceMap.set(id, { id, name: sr.name });
    }
  }
  const resources = Array.from(resourceMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "tr")
  );

  const listEntries: MistakeListEntry[] = (entriesRes.data ?? []).map((row) => {
    const resourceLabel =
      (row.resource_label as string | null)?.trim() ||
      oneName(
        row.study_resource as { name: string } | { name: string }[] | null
      );

    return {
      id: row.id as number,
      subjectName: oneName(
        row.subject as { name: string } | { name: string }[] | null
      ),
      topicName: oneName(
        row.topic as { name: string } | { name: string }[] | null
      ),
      resourceLabel,
      testLabel: (row.test_label as string | null) ?? null,
      questionNumber: (row.question_number as string | null) ?? null,
      causeType: row.cause_type as MistakeCauseType,
      status: row.status as "aktif" | "tamamlandi",
      solvedDate: row.solved_date as string,
      createdAt: row.created_at as string,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1.5">
        <h2 className="flex items-center gap-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
          <BookX className="h-7 w-7 text-[var(--accent)]" />
          Hata Defteri
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Bugün hangi testten hangi soruları yanlış yaptığını hızlıca ekle.
          Ortak bağlamı bir kez seç, soruları peş peşe gir.
        </p>
      </div>

      <MistakeQuickAddForm
        studentId={user.id}
        teacherId={teacherId}
        subjects={subjects}
        resources={resources}
      />

      <MistakeEntriesList entries={listEntries} />
    </div>
  );
}
