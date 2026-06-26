export interface TopicDraft {
  tempId: string;
  id?: number;
  name: string;
  target_count: number;
}

export interface ResourceTopicRow {
  id: number;
  name: string;
  target_count: number;
  order_index: number;
}

export interface TopicProgressTotals {
  solved: number;
  correct: number;
  wrong: number;
}

export interface TopicProgressRow {
  id: number | null;
  name: string;
  target_count: number;
  order_index: number;
  solved: number;
  correct: number;
  wrong: number;
  completionPct: number;
  net: number;
}

export interface StudyResource {
  id: string;
  name: string;
  publisher: string | null;
  cover_color: string;
  order_index: number;
  exam: { name: string } | null;
  subject: { name: string; color: string | null } | null;
  topicCount: number;
  totalQuestions: number;
  solvedTotal: number;
  correctTotal: number;
  wrongTotal: number;
  completionPct: number;
}

export interface StudyResourceWithTopics extends StudyResource {
  exam_id: number | null;
  subject_id: number | null;
  topics: ResourceTopicRow[];
}

export function topicsToDrafts(topics: ResourceTopicRow[]): TopicDraft[] {
  return [...topics]
    .sort((a, b) => a.order_index - b.order_index)
    .map((t) => ({
      tempId: `existing-${t.id}`,
      id: t.id,
      name: t.name,
      target_count: t.target_count,
    }));
}

export function calcResourceNet(correct: number, wrong: number): number {
  return correct - wrong / 4;
}

export function calcCompletionPct(solved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((solved / target) * 100));
}

export const EMPTY_RESOURCE_PROGRESS = {
  solvedTotal: 0,
  correctTotal: 0,
  wrongTotal: 0,
  completionPct: 0,
} as const;

export interface ExamOption {
  id: number;
  name: string;
}

export interface SubjectOption {
  id: number;
  name: string;
  exam_id: number | null;
  examName: string | null;
}

export interface StudentLite {
  id: string;
  full_name: string | null;
}

export const COVER_COLOR_PALETTE = [
  { value: "#2B4C8C", label: "Koyu Lacivert" },
  { value: "#1B6B3A", label: "Yeşil" },
  { value: "#3D3D3D", label: "Antrasit" },
  { value: "#8B1A2B", label: "Bordo" },
  { value: "#E85D04", label: "Turuncu" },
  { value: "#6B21A8", label: "Mor" },
  { value: "#6B7280", label: "Gri" },
  { value: "#78350F", label: "Kahve" },
  { value: "#1D4ED8", label: "Mavi" },
  { value: "#047857", label: "Zümrüt" },
  { value: "#DB2777", label: "Pembe" },
  { value: "#A78BFA", label: "Açık Mor" },
] as const;

export function examGroupFromName(name: string): string | undefined {
  const upper = name.toUpperCase();
  if (upper.includes("TYT")) return "TYT";
  if (upper.includes("AYT")) return "AYT";
  if (upper.includes("LGS")) return "LGS";
  return undefined;
}
