import {
  buildTopicErrorAnalysis,
  type NormalizedExam,
  type RawTopicErrorRecord,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

export interface WeakTopic {
  id: number;
  name: string;
  avgWrong: number;
}

function resultSubjectId(row: RawTopicErrorRecord): number | null {
  const result = Array.isArray(row.result) ? row.result[0] : row.result;
  return result?.subject_id ?? null;
}

/**
 * Son denemelerdeki "kötü" (severity === bad) konuları bulur.
 * AKR1/AKR2 ile aynı buildTopicErrorAnalysis mantığını kullanır.
 */
export function findStudentWeakTopics(
  rawErrors: RawTopicErrorRecord[],
  recentExams: NormalizedExam[]
): WeakTopic[] {
  if (recentExams.length === 0) return [];

  const errorsBySubject = new Map<number, RawTopicErrorRecord[]>();
  for (const row of rawErrors) {
    const subjectId = resultSubjectId(row);
    if (subjectId == null) continue;
    const rows = errorsBySubject.get(subjectId) ?? [];
    rows.push(row);
    errorsBySubject.set(subjectId, rows);
  }

  const weakByTopic = new Map<number, WeakTopic>();
  for (const rows of errorsBySubject.values()) {
    const analysis = buildTopicErrorAnalysis(rows, recentExams);
    for (const topic of analysis.rows) {
      if (topic.severity !== "bad") continue;
      const current = weakByTopic.get(topic.topicId);
      if (!current || topic.avgWrong > current.avgWrong) {
        weakByTopic.set(topic.topicId, {
          id: topic.topicId,
          name: topic.topicName,
          avgWrong: topic.avgWrong,
        });
      }
    }
  }

  return [...weakByTopic.values()].sort(
    (a, b) =>
      b.avgWrong - a.avgWrong || a.name.localeCompare(b.name, "tr-TR")
  );
}
