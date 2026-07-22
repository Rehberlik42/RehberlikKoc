import { redirect } from "next/navigation";
import { BookX } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import MistakeQuickAddForm from "./_components/MistakeQuickAddForm";
import type {
  MistakeResourceOption,
  MistakeSubjectOption,
} from "./_components/mistake-types";

export const dynamic = "force-dynamic";

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

  const [subjectsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, name, color, order_index, exam_id, exam:exams(name), topics(id, name, order_index, parent_id)"
      )
      .order("order_index"),
    supabase
      .from("resource_assignments")
      .select(
        `study_resource:study_resources!inner(id, name, is_active)`
      )
      .eq("student_id", user.id)
      .eq("study_resource.is_active", true),
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <BookX className="w-7 h-7 text-[var(--accent)]" />
          Hata Defteri
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
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
    </div>
  );
}
