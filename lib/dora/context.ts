import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeAnalysisExams,
  type RawTopicErrorRecord,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";
import { findStudentWeakTopics } from "@/lib/dora/weak-topics";
import {
  computeWeeklySummary,
  type SummaryPlanTask,
} from "@/lib/weekly-program-summary";
import {
  addDays,
  startOfWeek,
  toISODate,
} from "@/app/dashboard/student/program/_components/plan-shared";

/**
 * DORA akademik bağlamı.
 *
 * GÜVENLİK / GİZLİLİK:
 * - student_intake_sensitive ASLA sorgulanmaz / bağlama eklenmez.
 * - student_intake (anamnez) alanları ASLA sorgulanmaz / bağlama eklenmez.
 * Yalnızca deneme analizi, haftalık program ve kaynak atamaları kullanılır.
 */

export type DoraAcademicContext = {
  weakTopicsText: string;
  weekSummaryText: string;
  resourcesText: string;
  /** Sistem promptuna gömülecek birleşik metin */
  promptBlock: string;
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

async function loadWeakTopicsText(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const [recentExamsRes, topicErrorsRes] = await Promise.all([
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
      .eq("student_id", studentId)
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
      .eq("result.mock_exam.student_id", studentId),
  ]);

  if (recentExamsRes.error || topicErrorsRes.error) {
    return "Son denemelere ait zayıf konu verisi şu an okunamadı.";
  }

  const recentExams = normalizeAnalysisExams(
    (recentExamsRes.data ?? []) as Parameters<typeof normalizeAnalysisExams>[0]
  );
  const weakTopics = findStudentWeakTopics(
    (topicErrorsRes.data ?? []) as RawTopicErrorRecord[],
    recentExams
  );

  if (weakTopics.length === 0) {
    return "Son 5 denemede belirgin zayıf konu (kötü seviye) tespit edilmedi.";
  }

  const top = weakTopics.slice(0, 8);
  return top
    .map(
      (t, i) =>
        `${i + 1}. ${t.name} (ort. ${t.avgWrong.toFixed(1)} yanlış / deneme)`
    )
    .join("\n");
}

async function loadWeekSummaryText(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = toISODate(weekStart);
  const weekEndStr = toISODate(weekEnd);

  const { data, error } = await supabase
    .from("study_plan_tasks")
    .select(
      `plan_date, task_type, title, start_time, end_time, solved_count, details,
       subject:subjects(name)`
    )
    .eq("student_id", studentId)
    .eq("is_published", true)
    .gte("plan_date", weekStartStr)
    .lte("plan_date", weekEndStr)
    .order("plan_date", { ascending: true });

  if (error) {
    return "Bu haftaki program özeti okunamadı.";
  }

  const tasks: SummaryPlanTask[] = (data ?? []).map((row) => {
    const subjectRaw = Array.isArray(row.subject) ? row.subject[0] : row.subject;
    return {
      plan_date: row.plan_date as string,
      task_type: (row.task_type as string) ?? "ders",
      title: (row.title as string | undefined) ?? undefined,
      start_time: (row.start_time as string | null) ?? null,
      end_time: (row.end_time as string | null) ?? null,
      subject: subjectRaw ? { name: subjectRaw.name as string } : null,
      details: (row.details as Record<string, string | number> | null) ?? null,
      solved_count: (row.solved_count as number | null) ?? null,
    };
  });

  const summary = computeWeeklySummary(tasks, weekStart, null);

  if (summary.toplamGorev === 0) {
    return "Bu hafta programa henüz görev eklenmemiş.";
  }

  const dersLines =
    summary.dersDagilimi.length > 0
      ? summary.dersDagilimi
          .slice(0, 6)
          .map((d) => `- ${d.name}: ${d.count} görev`)
          .join("\n")
      : "- (ders dağılımı yok)";

  return [
    `Toplam görev: ${summary.toplamGorev}`,
    `Toplam süre: ${formatMinutes(summary.toplamSureDk)}`,
    `Deneme görevi: ${summary.denemeSayisi}, tekrar görevi: ${summary.tekrarSayisi}`,
    "Ders dağılımı:",
    dersLines,
  ].join("\n");
}

async function loadResourcesText(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("resource_assignments")
    .select(
      `study_resource:study_resources!inner(
         id, name, content_kind, is_active,
         subject:subjects(name)
       )`
    )
    .eq("student_id", studentId)
    .eq("study_resource.is_active", true);

  if (error) {
    return "Atanmış kaynak özeti okunamadı.";
  }

  type Row = {
    study_resource:
      | {
          id: string | number;
          name: string;
          content_kind: string | null;
          subject: { name: string } | { name: string }[] | null;
        }
      | {
          id: string | number;
          name: string;
          content_kind: string | null;
          subject: { name: string } | { name: string }[] | null;
        }[]
      | null;
  };

  const rows = (data ?? []) as Row[];
  const bySubject = new Map<string, number>();
  let total = 0;

  for (const row of rows) {
    const resource = Array.isArray(row.study_resource)
      ? row.study_resource[0] ?? null
      : row.study_resource;
    if (!resource) continue;
    total += 1;
    const subjectRaw = Array.isArray(resource.subject)
      ? resource.subject[0]
      : resource.subject;
    const subjectName = subjectRaw?.name?.trim() || "Ders atanmamış";
    bySubject.set(subjectName, (bySubject.get(subjectName) ?? 0) + 1);
  }

  if (total === 0) {
    return "Henüz atanmış aktif kaynak yok.";
  }

  const lines = [...bySubject.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .map(([name, count]) => `- ${name}: ${count} kaynak`);

  return [`Toplam atanmış aktif kaynak: ${total}`, ...lines].join("\n");
}

export async function buildDoraAcademicContext(
  supabase: SupabaseClient,
  studentId: string
): Promise<DoraAcademicContext> {
  const [weakTopicsText, weekSummaryText, resourcesText] = await Promise.all([
    loadWeakTopicsText(supabase, studentId),
    loadWeekSummaryText(supabase, studentId),
    loadResourcesText(supabase, studentId),
  ]);

  const promptBlock = [
    "### Son 5 denemedeki zayıf konular",
    weakTopicsText,
    "",
    "### Bu haftanın program özeti",
    weekSummaryText,
    "",
    "### Atanmış kaynaklar",
    resourcesText,
  ].join("\n");

  return { weakTopicsText, weekSummaryText, resourcesText, promptBlock };
}

export function buildDoraSystemPrompt(academicBlock: string): string {
  return `Sen DORA'sın — Mindora platformunda YKS'ye hazırlanan öğrencilere yardımcı olan, sıcak ve destekleyici bir çalışma arkadaşısın.

GÖREVIN: Öğrencinin ders çalışması, motivasyon, sınav hazırlığı ve kullandığı kaynaklarla ilgili sorularına yardımcı olmak. Aşağıdaki bilgileri kullanarak KİŞİSELLEŞTİRİLMİŞ tavsiyeler ver:

${academicBlock}

SINIRLARIN:
- Sadece ders çalışması, sınav hazırlığı, motivasyon ve çalışma teknikleri konularında yardımcı ol. Konu dışı isteklerde (kod yazma, alakasız genel sohbet vb.) nazikçe konuya dön.
- Tıbbi ya da psikolojik tanı/tedavi önerisi VERME. Öğrenci ciddi bir duygusal zorluk, kaygı, umutsuzluk ya da kendine zarar verme belirtisi gösterirse: onu ciddiye al, yargılamadan dinle, ama konuyu koçuyla veya güvendiği bir yetişkinle (aile/okul rehberlik servisi) paylaşmasını nazikçe öner. Kesinlikle bunu görmezden gelme ya da sadece "motive edici sözlerle" geçiştirme.
- Öğrencinin gerçek verilerini (zayıf konular, programı, kaynakları) sadece kendisiyle paylaş, asla üçüncü bir kişiye aitmiş gibi genelleme yapma.
- Kısa, samimi, anlaşılır cevaplar ver — uzun akademik metinler yazma.`;
}
