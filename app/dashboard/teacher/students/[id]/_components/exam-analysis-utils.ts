export type TopicSeverity = "good" | "medium" | "bad";
export type TopicTrend = "improving" | "worsening" | "stable";

export interface ExamColumnDef {
  mockExamId: number;
  label: string;
  shortDate: string;
}

export interface TopicErrorAnalysisRow {
  topicId: number;
  topicName: string;
  wrongByExamId: Record<number, number>;
  wrongsChronological: number[];
  avgWrong: number;
  severity: TopicSeverity;
  trend: TopicTrend;
}

export interface TopicErrorAnalysis {
  examColumns: ExamColumnDef[];
  rows: TopicErrorAnalysisRow[];
  topicCount: number;
  avgWrongPerExam: number;
  worstTopic: TopicErrorAnalysisRow | null;
  bestTopic: TopicErrorAnalysisRow | null;
}

export function topicSeverity(avgWrong: number): TopicSeverity {
  if (avgWrong <= 0.5) return "good";
  if (avgWrong <= 1.5) return "medium";
  return "bad";
}

export function topicSeverityColor(severity: TopicSeverity): string {
  switch (severity) {
    case "good":
      return "#22c55e";
    case "medium":
      return "#eab308";
    case "bad":
      return "#ef4444";
  }
}

export function topicSeverityBg(severity: TopicSeverity): string {
  switch (severity) {
    case "good":
      return "rgba(34,197,94,0.12)";
    case "medium":
      return "rgba(234,179,8,0.12)";
    case "bad":
      return "rgba(239,68,68,0.12)";
  }
}

export function topicTrendColor(trend: TopicTrend): string {
  switch (trend) {
    case "improving":
      return "#22c55e";
    case "worsening":
      return "#ef4444";
    case "stable":
      return "#9ca3af";
  }
}

export function computeTopicTrend(wrongs: number[]): TopicTrend {
  if (wrongs.length < 2) return "stable";
  const mid = Math.floor(wrongs.length / 2);
  const early =
    wrongs.slice(0, mid).reduce((s, n) => s + n, 0) / Math.max(mid, 1);
  const late =
    wrongs.slice(mid).reduce((s, n) => s + n, 0) /
    Math.max(wrongs.length - mid, 1);
  const diff = late - early;
  if (diff < -0.3) return "improving";
  if (diff > 0.3) return "worsening";
  return "stable";
}

export function formatExamShortDate(examDate: string): string {
  return new Date(examDate).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

export interface RawTopicErrorRecord {
  topic_id: number;
  wrong_count: number;
  topic:
    | { id: number; name: string; order_index?: number }
    | { id: number; name: string; order_index?: number }[]
    | null;
  result:
    | {
        id: number;
        subject_id: number;
        mock_exam_id: number;
        mock_exam:
          | { id: number; exam_date: string; student_id: string }
          | { id: number; exam_date: string; student_id: string }[];
      }
    | {
        id: number;
        subject_id: number;
        mock_exam_id: number;
        mock_exam:
          | { id: number; exam_date: string; student_id: string }
          | { id: number; exam_date: string; student_id: string }[];
      }[];
}

export function buildTopicErrorAnalysis(
  rawErrors: RawTopicErrorRecord[],
  filteredExams: NormalizedExam[]
): TopicErrorAnalysis {
  const examColumns: ExamColumnDef[] = [...filteredExams]
    .sort(
      (a, b) =>
        new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    )
    .map((exam, idx) => ({
      mockExamId: exam.id,
      label: exam.title?.trim() ? exam.title : `Deneme ${idx + 1}`,
      shortDate: formatExamShortDate(exam.exam_date),
    }));

  const allowedExamIds = new Set(examColumns.map((c) => c.mockExamId));
  const byTopic = new Map<
    number,
    { topicName: string; wrongs: Map<number, number> }
  >();

  for (const row of rawErrors) {
    const resultRaw = Array.isArray(row.result) ? row.result[0] : row.result;
    if (!resultRaw) continue;

    const mockExamRaw = Array.isArray(resultRaw.mock_exam)
      ? resultRaw.mock_exam[0]
      : resultRaw.mock_exam;
    const mockExamId = mockExamRaw?.id ?? resultRaw.mock_exam_id;
    if (!allowedExamIds.has(mockExamId)) continue;

    const topicRaw = Array.isArray(row.topic) ? row.topic[0] : row.topic;
    const topicName = topicRaw?.name ?? `Konu #${row.topic_id}`;

    const acc = byTopic.get(row.topic_id) ?? {
      topicName,
      wrongs: new Map<number, number>(),
    };
    acc.wrongs.set(
      mockExamId,
      (acc.wrongs.get(mockExamId) ?? 0) + (row.wrong_count ?? 0)
    );
    byTopic.set(row.topic_id, acc);
  }

  const rows: TopicErrorAnalysisRow[] = [];

  for (const [topicId, acc] of byTopic) {
    const wrongByExamId: Record<number, number> = {};
    const wrongsChronological: number[] = [];

    for (const col of examColumns) {
      const w = acc.wrongs.get(col.mockExamId) ?? 0;
      wrongByExamId[col.mockExamId] = w;
      wrongsChronological.push(w);
    }

    const avgWrong =
      examColumns.length > 0
        ? wrongsChronological.reduce((s, n) => s + n, 0) / examColumns.length
        : 0;

    rows.push({
      topicId,
      topicName: acc.topicName,
      wrongByExamId,
      wrongsChronological,
      avgWrong,
      severity: topicSeverity(avgWrong),
      trend: computeTopicTrend(wrongsChronological),
    });
  }

  rows.sort((a, b) => b.avgWrong - a.avgWrong || a.topicName.localeCompare(b.topicName, "tr-TR"));

  const totalWrongs = rows.reduce(
    (sum, row) =>
      sum + Object.values(row.wrongByExamId).reduce((s, n) => s + n, 0),
    0
  );
  const avgWrongPerExam =
    examColumns.length > 0 ? totalWrongs / examColumns.length : 0;

  const withErrors = rows.filter((r) =>
    Object.values(r.wrongByExamId).some((w) => w > 0)
  );

  return {
    examColumns,
    rows: withErrors,
    topicCount: withErrors.length,
    avgWrongPerExam,
    worstTopic: withErrors[0] ?? null,
    bestTopic:
      withErrors.length > 0
        ? [...withErrors].sort((a, b) => a.avgWrong - b.avgWrong)[0]
        : null,
  };
}

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
  examGroup: string | null;
  topicCount: number;
  examCount: number;
  avgNet: number;
  avgTotalQuestions: number;
  successPct: number;
}

export type ExamTypeFilter = "TYT" | "AYT" | "TYT+AYT";
export type LastNFilter = 3 | 5 | 10 | "all";

export function examGroupFromName(name: string): string | null {
  const upper = name.toUpperCase();
  if (upper.includes("TYT")) return "TYT";
  if (upper.includes("AYT")) return "AYT";
  if (upper.includes("LGS")) return "LGS";
  return null;
}

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
      examGroup: string | null;
      nets: number[];
      totals: number[];
    }
  >();

  for (const exam of exams) {
    const examGroup =
      examGroupFromName(exam.examName) ?? exam.examName ?? null;

    for (const r of exam.results) {
      const acc = bySubject.get(r.subjectId) ?? {
        subjectName: r.subjectName,
        color: r.color,
        examGroup,
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
      examGroup: acc.examGroup,
      topicCount: topicCountBySubjectId[subjectId] ?? 0,
      examCount,
      avgNet,
      avgTotalQuestions,
      successPct,
    });
  }

  const groupOrder = (g: string | null) => {
    if (g === "TYT") return 0;
    if (g === "AYT") return 1;
    if (g === "LGS") return 2;
    return 3;
  };

  return rows.sort((a, b) => {
    const byGroup = groupOrder(a.examGroup) - groupOrder(b.examGroup);
    if (byGroup !== 0) return byGroup;
    return a.subjectName.localeCompare(b.subjectName, "tr-TR");
  });
}
