import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import RecommendationsClient, {
  type ResourceItem,
  type SubjectInsight,
} from "./_components/RecommendationsClient";
import {
  assignedResourceTopicIds,
  buildStudentTopicResourceSuggestions,
  findStudentWeakTopics,
  type AssignedResourceRecord,
  type AssignedTopicProgressRecord,
  type TopicResourceSuggestion,
} from "./_components/TopicResourceSuggestions";
import {
  normalizeAnalysisExams,
  type RawTopicErrorRecord,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

export const dynamic = "force-dynamic";

interface MockExamResultRow {
  net: number | null;
  subject_id: number | null;
  subject:
    | {
        id: number;
        name: string;
        color: string | null;
        exam: { name: string } | null;
      }
    | null;
}

interface TopicProgressRow {
  status: string;
  topic: {
    id: number;
    subject_id: number;
    subject: {
      id: number;
      name: string;
      color: string | null;
      exam: { name: string } | null;
    } | null;
  } | null;
}

export default async function RecommendationsPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  // ─── 1) Son denemelerden zayif dersleri tespit et ──────────────────────────
  // AKR1/AKR2 ile aynı desen: önce exam_date'e göre benzersiz son 5 mock_exam,
  // sonra yalnızca o denemelere ait mock_exam_results satırlarıyla ders ortalaması.
  const { data: recentExamRows } = await supabase
    .from("mock_exams")
    .select("id")
    .eq("student_id", user.id)
    .order("exam_date", { ascending: false })
    .limit(5);

  const recentExamIds = (recentExamRows ?? []).map((exam) => exam.id as number);

  const { data: rawResults } =
    recentExamIds.length > 0
      ? await supabase
          .from("mock_exam_results")
          .select(
            `net, subject_id,
             subject:subjects(id, name, color, exam:exams(name))`
          )
          .in("mock_exam_id", recentExamIds)
      : { data: [] };

  const mockResults = (rawResults ?? []) as unknown as MockExamResultRow[];

  // Ders bazli ortalama net
  const subjectStats = new Map<
    number,
    { sum: number; count: number; subject: NonNullable<MockExamResultRow["subject"]> }
  >();
  for (const r of mockResults) {
    if (!r.subject_id || !r.subject || r.net == null) continue;
    const prev = subjectStats.get(r.subject_id) ?? {
      sum: 0,
      count: 0,
      subject: r.subject,
    };
    prev.sum += Number(r.net);
    prev.count += 1;
    subjectStats.set(r.subject_id, prev);
  }

  const weakFromExams: SubjectInsight[] = Array.from(subjectStats.values())
    .map((s) => ({
      subjectId: s.subject.id,
      subjectName: s.subject.name,
      examName: s.subject.exam?.name ?? null,
      color: s.subject.color,
      reason: "low_net" as const,
      avgNet: Number((s.sum / s.count).toFixed(2)),
    }))
    .sort((a, b) => (a.avgNet ?? 0) - (b.avgNet ?? 0)) // dusukten yuksege
    .slice(0, 5);

  // ─── 2) topic_progress'ten "calisiyorum" veya "tekrar gerekli" dersleri al ──
  const { data: rawProgress } = await supabase
    .from("topic_progress")
    .select(
      `status,
       topic:topics(id, subject_id, subject:subjects(id, name, color, exam:exams(name)))`
    )
    .eq("student_id", user.id)
    .in("status", ["in_progress", "needs_review"]);

  const progressRows = (rawProgress ?? []) as unknown as TopicProgressRow[];

  const subjectsFromProgress = new Map<number, SubjectInsight>();
  for (const row of progressRows) {
    const subj = row.topic?.subject;
    if (!subj) continue;
    if (subjectsFromProgress.has(subj.id)) continue;
    if (weakFromExams.find((w) => w.subjectId === subj.id)) continue;
    subjectsFromProgress.set(subj.id, {
      subjectId: subj.id,
      subjectName: subj.name,
      examName: subj.exam?.name ?? null,
      color: subj.color,
      reason: "in_progress",
      avgNet: null,
    });
  }

  // ─── 3) Hedef ders listesi (zayif + devam eden) ──────────────────────────
  const targetSubjects: SubjectInsight[] = [
    ...weakFromExams,
    ...Array.from(subjectsFromProgress.values()),
  ].slice(0, 8);

  const targetSubjectIds = targetSubjects.map((s) => s.subjectId);

  // ─── 4) Kaynaklari cek ─────────────────────────────────────────────────────
  // Once hedef derslere ait kaynaklar (zayif dersler oncelikli)
  // Sonra (yer varsa) genel ek kaynaklar
  const { data: rawTargeted } =
    targetSubjectIds.length > 0
      ? await supabase
          .from("resources")
          .select(
            `id, title, type, url, thumbnail_url, description, view_count, subject_id, topic_id,
             subject:subjects(id, name, color, exam:exams(name)),
             topic:topics(id, name)`
          )
          .eq("is_approved", true)
          .in("subject_id", targetSubjectIds)
          .order("view_count", { ascending: false })
          .limit(24)
      : { data: [] };

  const { data: rawAll } = await supabase
    .from("resources")
    .select(
      `id, title, type, url, thumbnail_url, description, view_count, subject_id, topic_id,
       subject:subjects(id, name, color, exam:exams(name)),
       topic:topics(id, name)`
    )
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  // De-dup: targeted'larin id'leri ile genel listeyi birlestir
  const targeted = (rawTargeted ?? []) as unknown as ResourceItem[];
  const all = (rawAll ?? []) as unknown as ResourceItem[];
  const seen = new Set(targeted.map((r) => r.id));
  const extras = all.filter((r) => !seen.has(r.id));
  const allResources: ResourceItem[] = [...targeted, ...extras];

  // ─── 5) Konu bazlı, yalnızca atanmış kaynaklardan öneriler ─────────────────
  // Eski ders/CMS öneri zincirinden bağımsızdır; mevcut verileri değiştirmez.
  const [recentExamsRes, topicErrorsRes, assignmentsRes] = await Promise.all([
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
      .limit(5),
    supabase
      .from("mock_exam_topic_errors")
      .select(
        `topic_id, wrong_count, correct_count, empty_count, not_in_exam,
         topic:topics(id, name, order_index),
         result:mock_exam_results!inner(
           id, subject_id, mock_exam_id,
           mock_exam:mock_exams!inner(id, exam_date, title, student_id, wrong_penalty_divisor)
         )`
      )
      .eq("result.mock_exam.student_id", user.id),
    supabase
      .from("resource_assignments")
      .select(
        `study_resource:study_resources!inner(
           id, name, content_kind, is_active,
           topics:study_resource_topics(id, topic_id)
         )`
      )
      .eq("student_id", user.id)
      .eq("study_resource.is_active", true)
      .in("study_resource.content_kind", ["soru_bankasi", "konu_anlatimi"]),
  ]);

  let topicResourceSuggestions: TopicResourceSuggestion[] = [];
  if (
    !recentExamsRes.error &&
    !topicErrorsRes.error &&
    !assignmentsRes.error
  ) {
    const recentExams = normalizeAnalysisExams(
      (recentExamsRes.data ?? []) as Parameters<
        typeof normalizeAnalysisExams
      >[0]
    );
    const weakTopics = findStudentWeakTopics(
      (topicErrorsRes.data ?? []) as RawTopicErrorRecord[],
      recentExams
    );
    const assignments =
      (assignmentsRes.data ?? []) as AssignedResourceRecord[];
    const resourceTopicIds = assignedResourceTopicIds(assignments);
    let progressRows: AssignedTopicProgressRecord[] = [];
    let progressFailed = false;

    if (weakTopics.length > 0 && resourceTopicIds.length > 0) {
      const { data, error } = await supabase
        .from("study_resource_topic_progress")
        .select("study_resource_topic_id, status")
        .eq("student_id", user.id)
        .in("study_resource_topic_id", resourceTopicIds);
      progressFailed = error != null;
      progressRows = (data ?? []) as AssignedTopicProgressRecord[];
    }

    if (!progressFailed) {
      topicResourceSuggestions = buildStudentTopicResourceSuggestions(
        weakTopics,
        assignments,
        progressRows
      );
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
          DORA&apos;nın Senin İçin Seçtikleri
        </h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Son çalışmalarına göre kişiselleştirilmiş kaynak önerileri.
        </p>
      </div>

      <RecommendationsClient
        targetSubjects={targetSubjects}
        targetedResources={targeted}
        allResources={allResources}
        topicResourceSuggestions={topicResourceSuggestions}
      />
    </div>
  );
}
