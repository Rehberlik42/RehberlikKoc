import type { ProgramSubject } from "../program-types";
import {
  getTaskTypeShortLabel,
  TASK_TYPE_SHORT_LABEL,
} from "@/lib/program/task-type-icons";
import type { TaskType } from "@/lib/program/task-payload";
import { getTaskDurationMinutes } from "@/lib/weekly-program-summary";

export type MatrixTask = {
  id: string;
  plan_date: string;
  task_type: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  is_published: boolean;
  subject_id: number | null;
  topic_id: number | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
  details: Record<string, string | number> | null;
};

export type MatrixRowKey = `subject:${number}` | `other:${string}`;

export type TopicBlock = {
  topicKey: string;
  topicLabel: string;
  tasks: MatrixTask[];
};

export type MatrixRow = {
  rowKey: MatrixRowKey;
  label: string;
  subjectId: number | null;
  /** "Diğer" alt satırları için görev türü */
  otherTaskType: string | null;
};

const OTHER_TYPE_ORDER: TaskType[] = [
  "deneme",
  "bras_deneme",
  "kitap_okuma",
  "manuel",
  "ders",
  "soru_cozumu",
  "video_izleme",
  "tekrar",
  "yanlis_analizi",
  "odev",
];

export function subjectRowLabel(subject: ProgramSubject): string {
  const prefix = subject.exam ? `${subject.exam} ` : "";
  return `${prefix}${subject.name}`;
}

export function getTaskRowKey(task: MatrixTask): MatrixRowKey {
  if (task.subject_id != null) return `subject:${task.subject_id}`;
  return `other:${task.task_type}`;
}

export function cellDroppableId(rowKey: string, dateStr: string): string {
  return `cell:${rowKey}:${dateStr}`;
}

export function parseCellDroppableId(
  id: string
): { rowKey: string; dateStr: string } | null {
  if (!id.startsWith("cell:")) return null;
  const rest = id.slice("cell:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const dateStr = rest.slice(lastColon + 1);
  const rowKey = rest.slice(0, lastColon);
  if (!dateStr || !rowKey) return null;
  return { rowKey, dateStr };
}

export function getTopicLabel(task: MatrixTask): string {
  if (task.topic?.name?.trim()) return task.topic.name.trim();
  if (task.subject_id == null) {
    const title = task.title?.trim();
    if (title) return title;
    return getTaskTypeShortLabel(task.task_type);
  }
  // Başlıktan "TYT X — Konu" kalıbını ayıkla
  const title = task.title?.trim() ?? "";
  const dash = title.indexOf("—");
  if (dash >= 0) {
    const after = title.slice(dash + 1).trim();
    if (after) return after;
  }
  return title || "Konu yok";
}

function detailPositiveNumber(
  value: string | number | undefined
): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** details'tan gerçek içerik; tür adı fallback yok. Yoksa null. */
export function getActivityShortLabel(task: MatrixTask): string | null {
  const parts: string[] = [];
  const d = task.details;

  const questions = detailPositiveNumber(d?.planned_question_count);
  if (questions != null) parts.push(`${Math.floor(questions)} soru`);

  const est = detailPositiveNumber(d?.estimated_duration_minutes);
  const mins =
    est != null ? Math.floor(est) : getTaskDurationMinutes(task);
  if (mins > 0) parts.push(`${mins} dk`);

  const pageRaw = d?.page_range;
  if (typeof pageRaw === "string" && pageRaw.trim()) {
    const page = pageRaw.trim();
    parts.push(/^s\.?\s?/i.test(page) ? page : `s. ${page}`);
  } else if (typeof pageRaw === "number" && Number.isFinite(pageRaw)) {
    parts.push(`s. ${pageRaw}`);
  }

  const mockName =
    typeof d?.mock_name === "string" ? d.mock_name.trim() : "";
  const mockPublisher =
    typeof d?.mock_publisher === "string" ? d.mock_publisher.trim() : "";
  if (mockName || mockPublisher) {
    parts.push([mockPublisher, mockName].filter(Boolean).join(" "));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function groupCellTasks(tasks: MatrixTask[]): TopicBlock[] {
  const sorted = [...tasks].sort((a, b) => a.order_index - b.order_index);
  const blocks: TopicBlock[] = [];
  const indexByKey = new Map<string, number>();

  for (const task of sorted) {
    const topicKey =
      task.topic_id != null
        ? `id:${task.topic_id}`
        : `t:${getTopicLabel(task)}`;
    const existing = indexByKey.get(topicKey);
    if (existing != null) {
      blocks[existing].tasks.push(task);
      continue;
    }
    indexByKey.set(topicKey, blocks.length);
    blocks.push({
      topicKey,
      topicLabel: getTopicLabel(task),
      tasks: [task],
    });
  }

  return blocks;
}

export function buildMatrixRows(
  tasks: MatrixTask[],
  subjects: ProgramSubject[]
): MatrixRow[] {
  const subjectOrder = new Map(subjects.map((s, i) => [s.id, i]));
  const subjectIdsWithTasks = new Set<number>();
  const otherTypesWithTasks = new Set<string>();

  for (const task of tasks) {
    if (task.subject_id != null) subjectIdsWithTasks.add(task.subject_id);
    else otherTypesWithTasks.add(task.task_type);
  }

  const subjectRows: MatrixRow[] = [];
  for (const subject of subjects) {
    if (!subjectIdsWithTasks.has(subject.id)) continue;
    subjectRows.push({
      rowKey: `subject:${subject.id}`,
      label: subjectRowLabel(subject),
      subjectId: subject.id,
      otherTaskType: null,
    });
  }

  // subjects listesinde olmayan ama görevde geçen subject_id
  const knownIds = new Set(subjects.map((s) => s.id));
  const orphanIds = [...subjectIdsWithTasks].filter((id) => !knownIds.has(id));
  orphanIds.sort((a, b) => a - b);
  for (const id of orphanIds) {
    const sample = tasks.find((t) => t.subject_id === id);
    const name = sample?.subject?.name?.trim() || `Ders #${id}`;
    subjectRows.push({
      rowKey: `subject:${id}`,
      label: name,
      subjectId: id,
      otherTaskType: null,
    });
  }

  subjectRows.sort((a, b) => {
    const ai = subjectOrder.get(a.subjectId!) ?? Number.MAX_SAFE_INTEGER;
    const bi = subjectOrder.get(b.subjectId!) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label, "tr");
  });

  const otherRows: MatrixRow[] = [];
  const orderedOther = [
    ...OTHER_TYPE_ORDER.filter((t) => otherTypesWithTasks.has(t)),
    ...[...otherTypesWithTasks].filter(
      (t) => !OTHER_TYPE_ORDER.includes(t as TaskType)
    ),
  ];

  for (const taskType of orderedOther) {
    otherRows.push({
      rowKey: `other:${taskType}`,
      label: TASK_TYPE_SHORT_LABEL[taskType as TaskType] ?? getTaskTypeShortLabel(taskType),
      subjectId: null,
      otherTaskType: taskType,
    });
  }

  return [...subjectRows, ...otherRows];
}

export function tasksForCell(
  tasks: MatrixTask[],
  rowKey: MatrixRowKey,
  dateStr: string
): MatrixTask[] {
  return tasks
    .filter((t) => t.plan_date === dateStr && getTaskRowKey(t) === rowKey)
    .sort((a, b) => a.order_index - b.order_index);
}
