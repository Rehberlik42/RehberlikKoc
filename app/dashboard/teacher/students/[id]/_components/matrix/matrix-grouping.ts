import type { ProgramSubject } from "../program-types";
import {
  getTaskTypeShortLabel,
} from "@/lib/program/task-type-icons";
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

/** Aynı gün + subject + topic birleşik blok; derssiz görevler tekil. */
export type TaskBlock = {
  /** Sürükle-bırak kimliği */
  blockId: string;
  planDate: string;
  subjectId: number | null;
  topicId: number | null;
  /** Başlık: "TYT Matematik" veya tür adı */
  subjectLabel: string;
  /** Konu satırı; yoksa null (satır render edilmez) */
  topicLabel: string | null;
  /** Başlık ikonu için (blokta en küçük order_index) */
  headerTaskType: string;
  tasks: MatrixTask[];
  minOrderIndex: number;
};

export function subjectRowLabel(subject: ProgramSubject): string {
  const prefix = subject.exam ? `${subject.exam} ` : "";
  return `${prefix}${subject.name}`;
}

/** Grup anahtarı — subject yoksa her görev ayrı blok. */
export function getBlockGroupKey(task: MatrixTask): string {
  if (task.subject_id == null) return `solo:${task.id}`;
  return `s:${task.subject_id}:t:${task.topic_id ?? "null"}`;
}

export function makeBlockId(taskIds: string[]): string {
  return `block:${[...taskIds].sort().join("+")}`;
}

export function cellDroppableId(dateStr: string, slotIndex: number): string {
  return `cell:${dateStr}:${slotIndex}`;
}

export function parseCellDroppableId(
  id: string
): { dateStr: string; slotIndex: number } | null {
  if (!id.startsWith("cell:")) return null;
  const rest = id.slice("cell:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const dateStr = rest.slice(0, lastColon);
  const slotRaw = rest.slice(lastColon + 1);
  const slotIndex = Number(slotRaw);
  if (!dateStr || !Number.isInteger(slotIndex) || slotIndex < 0) return null;
  return { dateStr, slotIndex };
}

export function isBlockDragId(id: string): boolean {
  return id.startsWith("block:");
}

export function getTopicLabel(task: MatrixTask): string | null {
  const name = task.topic?.name?.trim();
  return name ? name : null;
}

export function getBlockSubjectLabel(
  task: MatrixTask,
  subjects: ProgramSubject[]
): string {
  if (task.subject_id == null) {
    return getTaskTypeShortLabel(task.task_type);
  }
  const fromList = subjects.find((s) => s.id === task.subject_id);
  if (fromList) return subjectRowLabel(fromList);
  const name = task.subject?.name?.trim();
  return name || `Ders #${task.subject_id}`;
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

/**
 * Etkinlik satırı metni — her zaman dolu.
 * Öncelik: soru sayısı → süre → sayfa → tür adı.
 */
export function getActivityDisplayLabel(task: MatrixTask): string {
  const d = task.details;

  const questions = detailPositiveNumber(d?.planned_question_count);
  if (questions != null) return `${Math.floor(questions)} soru çözümü`;

  const est = detailPositiveNumber(d?.estimated_duration_minutes);
  if (est != null) return `${Math.floor(est)} dk`;

  const fromTimes = getTaskDurationMinutes(task);
  if (fromTimes > 0) return `${fromTimes} dk`;

  const pageRaw = d?.page_range;
  if (typeof pageRaw === "string" && pageRaw.trim()) {
    const page = pageRaw.trim();
    return /^s\.?\s?/i.test(page) ? page : `s. ${page}`;
  }
  if (typeof pageRaw === "number" && Number.isFinite(pageRaw)) {
    return `s. ${pageRaw}`;
  }

  const mockName =
    typeof d?.mock_name === "string" ? d.mock_name.trim() : "";
  const mockPublisher =
    typeof d?.mock_publisher === "string" ? d.mock_publisher.trim() : "";
  if (mockName || mockPublisher) {
    return [mockPublisher, mockName].filter(Boolean).join(" ");
  }

  return getTaskTypeShortLabel(task.task_type);
}

/** Geriye dönük: kısa etiket; yoksa null (önizleme için). */
export function getActivityShortLabel(task: MatrixTask): string | null {
  const label = getActivityDisplayLabel(task);
  const typeOnly = getTaskTypeShortLabel(task.task_type);
  return label === typeOnly ? null : label;
}

function buildBlock(
  planDate: string,
  tasks: MatrixTask[],
  subjects: ProgramSubject[]
): TaskBlock {
  const sorted = [...tasks].sort((a, b) => a.order_index - b.order_index);
  const head = sorted[0];
  return {
    blockId: makeBlockId(sorted.map((t) => t.id)),
    planDate,
    subjectId: head.subject_id,
    topicId: head.topic_id,
    subjectLabel: getBlockSubjectLabel(head, subjects),
    topicLabel: getTopicLabel(head),
    headerTaskType: head.task_type,
    tasks: sorted,
    minOrderIndex: head.order_index,
  };
}

/** Bir günün görevlerini bloklara ayırır; min order_index ile sıralar. */
export function groupDayIntoBlocks(
  dayTasks: MatrixTask[],
  subjects: ProgramSubject[]
): TaskBlock[] {
  const byKey = new Map<string, MatrixTask[]>();
  for (const task of dayTasks) {
    const key = getBlockGroupKey(task);
    const list = byKey.get(key) ?? [];
    list.push(task);
    byKey.set(key, list);
  }

  const blocks = [...byKey.values()].map((group) =>
    buildBlock(group[0].plan_date, group, subjects)
  );
  blocks.sort((a, b) => {
    if (a.minOrderIndex !== b.minOrderIndex) {
      return a.minOrderIndex - b.minOrderIndex;
    }
    return a.blockId.localeCompare(b.blockId);
  });
  return blocks;
}

export function buildBlocksByDate(
  tasks: MatrixTask[],
  subjects: ProgramSubject[],
  weekDateStrs: string[]
): {
  blocksByDate: Map<string, TaskBlock[]>;
  slotCount: number;
} {
  const blocksByDate = new Map<string, TaskBlock[]>();
  let slotCount = 0;

  for (const dateStr of weekDateStrs) {
    const dayTasks = tasks.filter((t) => t.plan_date === dateStr);
    const blocks = groupDayIntoBlocks(dayTasks, subjects);
    blocksByDate.set(dateStr, blocks);
    if (blocks.length > slotCount) slotCount = blocks.length;
  }

  return { blocksByDate, slotCount };
}

export function findBlockById(
  blocksByDate: Map<string, TaskBlock[]>,
  blockId: string
): { dateStr: string; slotIndex: number; block: TaskBlock } | null {
  for (const [dateStr, blocks] of blocksByDate) {
    const slotIndex = blocks.findIndex((b) => b.blockId === blockId);
    if (slotIndex >= 0) {
      return { dateStr, slotIndex, block: blocks[slotIndex] };
    }
  }
  return null;
}

/** Blok sırasına göre gün görevlerinin order_index'ini yeniden yazar. */
export function flattenBlocksToTasks(
  blocks: TaskBlock[],
  planDate: string
): MatrixTask[] {
  const out: MatrixTask[] = [];
  let order = 0;
  for (const block of blocks) {
    for (const task of block.tasks) {
      out.push({
        ...task,
        plan_date: planDate,
        order_index: order++,
      });
    }
  }
  return out;
}
