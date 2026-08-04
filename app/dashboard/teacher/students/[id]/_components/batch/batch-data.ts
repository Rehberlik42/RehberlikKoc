import { createClient } from "@/lib/supabase/client";
import { findWeakTopics, type WeakTopic } from "@/lib/program/weak-topics";
import { normalizeStatus } from "@/lib/resource-status-ui";
import {
  buildTopicErrorAnalysis,
  normalizeAnalysisExams,
  type RawTopicErrorRecord,
} from "../exam-analysis-utils";

export type WeakTopicStat = WeakTopic & {
  /** Doğru / (doğru+yanlış+boş); veri yoksa null */
  successRate: number | null;
};

export type BatchPoolData = {
  weak: WeakTopicStat[];
  /** Başlanmayan merkezi topic id'leri */
  notStartedTopicIds: number[];
};

const poolCache = new Map<string, BatchPoolData>();
const poolPromise = new Map<string, Promise<BatchPoolData>>();

function resultSubjectId(row: RawTopicErrorRecord): number | null {
  const result = Array.isArray(row.result) ? row.result[0] : row.result;
  return result?.subject_id ?? null;
}

function successRateFromAnalysis(
  rawErrors: RawTopicErrorRecord[],
  recentExams: ReturnType<typeof normalizeAnalysisExams>
): Map<number, number | null> {
  const rates = new Map<number, number | null>();
  if (recentExams.length === 0) return rates;

  const errorsBySubject = new Map<number, RawTopicErrorRecord[]>();
  for (const row of rawErrors) {
    const subjectId = resultSubjectId(row);
    if (subjectId == null) continue;
    const rows = errorsBySubject.get(subjectId) ?? [];
    rows.push(row);
    errorsBySubject.set(subjectId, rows);
  }

  for (const rows of errorsBySubject.values()) {
    const analysis = buildTopicErrorAnalysis(rows, recentExams);
    for (const topic of analysis.rows) {
      if (topic.severity !== "bad") continue;
      let correct = 0;
      let total = 0;
      for (const examId of Object.keys(topic.wrongByExamId)) {
        const id = Number(examId);
        const w = topic.wrongByExamId[id];
        const c = topic.correctByExamId[id];
        const e = topic.emptyByExamId[id];
        if (w == null && c == null) continue;
        correct += c ?? 0;
        total += (c ?? 0) + (w ?? 0) + (e ?? 0);
      }
      rates.set(
        topic.topicId,
        total > 0 ? Math.round((100 * correct) / total) : null
      );
    }
  }

  return rates;
}

async function fetchPoolData(studentId: string): Promise<BatchPoolData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Oturum süresi doldu");

  const [
    { data: rawAnalysisExams },
    { data: rawTopicErrors },
    { data: resourceTopicRows },
  ] = await Promise.all([
    supabase
      .from("mock_exams")
      .select(
        "id, exam_date, title, exam:exams(id, name), results:mock_exam_results(subject_id, correct_count, wrong_count, empty_count, net, subject:subjects(id, name, color))"
      )
      .eq("student_id", studentId)
      .order("exam_date", { ascending: false })
      .limit(50),
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
    supabase
      .from("study_resource_topics")
      .select(
        "id, topic_id, resource:study_resources!inner(id, is_active, teacher_id)"
      )
      .not("topic_id", "is", null)
      .eq("resource.is_active", true)
      .eq("resource.teacher_id", user.id),
  ]);

  const analysisExams = normalizeAnalysisExams(
    (rawAnalysisExams ?? []) as Parameters<typeof normalizeAnalysisExams>[0]
  );
  const suggestionExams = [...analysisExams]
    .sort(
      (a, b) =>
        new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
    )
    .slice(0, 5);

  const errors = (rawTopicErrors ?? []) as RawTopicErrorRecord[];
  const weakBase = findWeakTopics(errors, suggestionExams);
  const rates = successRateFromAnalysis(errors, suggestionExams);
  const weak: WeakTopicStat[] = weakBase.map((t) => ({
    ...t,
    successRate: rates.get(t.id) ?? null,
  }));

  const resourceTopics = (resourceTopicRows ?? []) as {
    id: number;
    topic_id: number | null;
  }[];
  const srtIds = resourceTopics.map((r) => r.id);
  const topicIdsBySrt = new Map(
    resourceTopics
      .filter((r) => r.topic_id != null)
      .map((r) => [r.id, r.topic_id as number])
  );

  let notStartedTopicIds: number[] = [];
  if (srtIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("study_resource_topic_progress")
      .select("study_resource_topic_id, status")
      .eq("student_id", studentId)
      .in("study_resource_topic_id", srtIds);

    const statusBySrt = new Map(
      (progressRows ?? []).map((p) => [
        p.study_resource_topic_id as number,
        (p.status as string | null) ?? null,
      ])
    );

    const notStarted = new Set<number>();
    for (const srtId of srtIds) {
      const topicId = topicIdsBySrt.get(srtId);
      if (topicId == null) continue;
      const status = statusBySrt.get(srtId);
      // Kayıt yok VEYA kanonik durum calisilmadi → başlanmayan
      if (status == null || normalizeStatus(status) === "calisilmadi") {
        notStarted.add(topicId);
      }
    }
    notStartedTopicIds = [...notStarted];
  }

  return { weak, notStartedTopicIds };
}

export function getCachedBatchPool(studentId: string): BatchPoolData | null {
  return poolCache.get(studentId) ?? null;
}

export function loadBatchPool(studentId: string): Promise<BatchPoolData> {
  const cached = poolCache.get(studentId);
  if (cached) return Promise.resolve(cached);

  const existing = poolPromise.get(studentId);
  if (existing) return existing;

  const promise = fetchPoolData(studentId)
    .then((data) => {
      poolCache.set(studentId, data);
      poolPromise.delete(studentId);
      return data;
    })
    .catch((err) => {
      poolPromise.delete(studentId);
      throw err;
    });

  poolPromise.set(studentId, promise);
  return promise;
}

/** Kaynak listesi cache — BatchSettings tembel yükleme */
export type BatchResourceOption = {
  id: number;
  name: string;
  content_kind: string;
  exam: { name: string } | null;
  subject: { name: string } | null;
};

const resourceListCache = new Map<string, BatchResourceOption[]>();
const resourceTopicsCache = new Map<
  number,
  { id: number; name: string; topic_id: number | null; target_count: number }[]
>();

const TRACKED_CONTENT_KINDS = new Set(["soru_bankasi", "konu_anlatimi"]);
const TOPIC_TRACKED_TASK_TYPES = new Set(["soru_cozumu", "yanlis_analizi"]);

export function taskTypeUsesTrackedResources(taskType: string): boolean {
  return TOPIC_TRACKED_TASK_TYPES.has(taskType);
}

export function filterResourcesForTaskType(
  resources: BatchResourceOption[],
  taskType: string,
  selectedId: string
): BatchResourceOption[] {
  const base = taskTypeUsesTrackedResources(taskType)
    ? resources.filter((r) => TRACKED_CONTENT_KINDS.has(r.content_kind))
    : resources;
  if (!selectedId) return base;
  if (base.some((r) => String(r.id) === selectedId)) return base;
  const current = resources.find((r) => String(r.id) === selectedId);
  return current ? [...base, current] : base;
}

export async function loadBatchResources(
  subjectId: string
): Promise<BatchResourceOption[]> {
  const key = subjectId || "__all__";
  const cached = resourceListCache.get(key);
  if (cached) return cached;

  const supabase = createClient();
  let query = supabase
    .from("study_resources")
    .select(
      "id, name, content_kind, exam:exams(name), subject:subjects(name)"
    )
    .eq("is_active", true)
    .order("order_index");

  if (subjectId) {
    query = query.eq("subject_id", parseInt(subjectId, 10));
  }

  const { data } = await query;
  const mapped: BatchResourceOption[] = (data ?? []).map((row) => {
    const examRaw = row.exam as
      | { name: string }
      | { name: string }[]
      | null;
    const subjectRaw = row.subject as
      | { name: string }
      | { name: string }[]
      | null;
    return {
      id: row.id as number,
      name: row.name as string,
      content_kind: (row.content_kind as string | null) ?? "soru_bankasi",
      exam: Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw,
      subject: Array.isArray(subjectRaw)
        ? subjectRaw[0] ?? null
        : subjectRaw,
    };
  });

  resourceListCache.set(key, mapped);
  return mapped;
}

export async function loadBatchResourceTopics(resourceId: number) {
  const cached = resourceTopicsCache.get(resourceId);
  if (cached) return cached;

  const supabase = createClient();
  const { data } = await supabase
    .from("study_resource_topics")
    .select("id, name, target_count, order_index, topic_id")
    .eq("study_resource_id", resourceId)
    .order("order_index");

  const topics = [...(data ?? [])]
    .map((t) => ({
      id: t.id as number,
      name: t.name as string,
      topic_id: (t.topic_id as number | null) ?? null,
      target_count: (t.target_count as number) ?? 0,
    }))
    .sort((a, b) => a.id - b.id);

  resourceTopicsCache.set(resourceId, topics);
  return topics;
}

export function findLinkedResourceTopicId(
  topics: { id: number; topic_id: number | null }[],
  centralTopicId: number
): number | null {
  const match = topics.find(
    (t) => t.topic_id != null && t.topic_id === centralTopicId
  );
  return match?.id ?? null;
}
