export type TaskType = "ders" | "deneme" | "bras_deneme";

export interface PlanTask {
  id: string;
  plan_date: string;
  task_type: TaskType;
  title: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  subject: { name: string } | null;
  topic: { name: string } | null;
}

export const DAY_LABELS_FULL = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

export const TASK_TYPE_BADGE: Record<TaskType, { label: string; color: string }> = {
  ders: { label: "Ders", color: "#4F7CFF" },
  deneme: { label: "Deneme", color: "#A78BFF" },
  bras_deneme: { label: "Branş Denemesi", color: "#00D4FF" },
};

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function getDayLabelFull(d: Date): string {
  const day = d.getDay();
  const index = day === 0 ? 6 : day - 1;
  return DAY_LABELS_FULL[index];
}

export function formatTimeTR(time: string) {
  return time.slice(0, 5);
}

export function calcDurationMinutes(start: string, end: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return null;
  return endMin - startMin;
}

export function mapStudyPlanTaskRow(row: {
  id: string;
  plan_date: string;
  task_type: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  order_index: number;
  is_completed: boolean;
  subject: { name: string } | { name: string }[] | null;
  topic: { name: string } | { name: string }[] | null;
}): PlanTask {
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topicRaw = row.topic;
  const topic = Array.isArray(topicRaw) ? topicRaw[0] ?? null : topicRaw;

  return {
    id: row.id,
    plan_date: row.plan_date,
    task_type: row.task_type as TaskType,
    title: row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    break_minutes: row.break_minutes,
    order_index: row.order_index,
    is_completed: row.is_completed,
    subject: subject as { name: string } | null,
    topic: topic as { name: string } | null,
  };
}

export const STUDY_PLAN_TASK_SELECT =
  "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, subject:subjects(name), topic:topics(name)";
