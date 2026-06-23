export interface NormalizedExamResult {
  subjectId: number;
  subjectName: string;
  color: string | null;
  correct: number;
  wrong: number;
  empty: number;
  net: number;
}

export interface NormalizedExam {
  id: number;
  exam_date: string;
  title: string | null;
  examId: number;
  examName: string;
  results: NormalizedExamResult[];
}

export interface SubjectAnalysisRow {
  subjectId: number;
  subjectName: string;
  color: string | null;
  topicCount: number;
  examCount: number;
  avgNet: number;
  avgTotalQuestions: number;
  successPct: number;
}

export type ExamTypeFilter = "TYT" | "AYT" | "TYT+AYT";
export type LastNFilter = 3 | 5 | 10 | "all";

export function examMatchesFilter(
  examName: string,
  filter: ExamTypeFilter
): boolean {
  const upper = examName.toUpperCase();
  const isTyt = upper.includes("TYT");
  const isAyt = upper.includes("AYT");

  switch (filter) {
    case "TYT":
      return isTyt;
    case "AYT":
      return isAyt;
    case "TYT+AYT":
      return isTyt || isAyt;
  }
}

export function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeAnalysisExams(
  raw: {
    id: number;
    exam_date: string;
    title: string | null;
    exam:
      | { id: number; name: string }
      | { id: number; name: string }[]
      | null;
    results:
      | {
          subject_id: number;
          correct_count: number | null;
          wrong_count: number | null;
          empty_count: number | null;
          net: number | null;
          subject:
            | { id: number; name: string; color: string | null }
            | { id: number; name: string; color: string | null }[]
            | null;
        }[]
      | null;
  }[]
): NormalizedExam[] {
  return raw.map((m) => {
    const examRaw = Array.isArray(m.exam) ? m.exam[0] : m.exam;
    const resultsArr = Array.isArray(m.results) ? m.results : [];

    return {
      id: m.id,
      exam_date: m.exam_date,
      title: m.title,
      examId: examRaw?.id ?? 0,
      examName: examRaw?.name ?? "",
      results: resultsArr.map((r) => {
        const subRaw = Array.isArray(r.subject) ? r.subject[0] : r.subject;
        const correct = r.correct_count ?? 0;
        const wrong = r.wrong_count ?? 0;
        const net =
          r.net != null
            ? Number(r.net)
            : correct - wrong / 4;

        return {
          subjectId: r.subject_id,
          subjectName: subRaw?.name ?? "—",
          color: subRaw?.color ?? null,
          correct,
          wrong,
          empty: r.empty_count ?? 0,
          net,
        };
      }),
    };
  });
}

export function filterExamsForAnalysis(
  allExams: NormalizedExam[],
  examTypeFilter: ExamTypeFilter,
  lastN: LastNFilter
): NormalizedExam[] {
  const filtered = allExams
    .filter((e) => examMatchesFilter(e.examName, examTypeFilter))
    .sort(
      (a, b) =>
        new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
    );

  if (lastN === "all") return filtered;
  return filtered.slice(0, lastN);
}

export function computeSubjectAnalysis(
  exams: NormalizedExam[],
  topicCountBySubjectId: Record<number, number>
): SubjectAnalysisRow[] {
  const bySubject = new Map<
    number,
    {
      subjectName: string;
      color: string | null;
      nets: number[];
      totals: number[];
    }
  >();

  for (const exam of exams) {
    for (const r of exam.results) {
      const acc = bySubject.get(r.subjectId) ?? {
        subjectName: r.subjectName,
        color: r.color,
        nets: [],
        totals: [],
      };
      acc.nets.push(r.net);
      acc.totals.push(r.correct + r.wrong + r.empty);
      bySubject.set(r.subjectId, acc);
    }
  }

  const rows: SubjectAnalysisRow[] = [];

  for (const [subjectId, acc] of bySubject) {
    const examCount = acc.nets.length;
    const avgNet =
      examCount > 0
        ? acc.nets.reduce((s, n) => s + n, 0) / examCount
        : 0;
    const avgTotalQuestions =
      examCount > 0
        ? acc.totals.reduce((s, n) => s + n, 0) / examCount
        : 0;
    const successPct =
      avgTotalQuestions > 0
        ? clampPct((avgNet / avgTotalQuestions) * 100)
        : 0;

    rows.push({
      subjectId,
      subjectName: acc.subjectName,
      color: acc.color,
      topicCount: topicCountBySubjectId[subjectId] ?? 0,
      examCount,
      avgNet,
      avgTotalQuestions,
      successPct,
    });
  }

  return rows.sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName, "tr-TR")
  );
}
