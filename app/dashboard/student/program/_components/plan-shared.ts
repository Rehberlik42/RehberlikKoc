export type TaskType = "ders" | "deneme" | "bras_deneme";

export interface TaskSolutionData {
  solved_count: number;
  correct_count: number;
  wrong_count: number;
}

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
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  solved_count: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
  resource: { name: string } | null;
  resourceTopic: { name: string } | null;
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

export function isResourceLinked(task: Pick<PlanTask, "study_resource_id">): boolean {
  return task.study_resource_id != null;
}

export function calcTaskNet(correct: number, wrong: number): number {
  return correct - wrong / 4;
}

export function applyTaskToggleOptimistic(
  task: PlanTask,
  next: boolean,
  data?: TaskSolutionData
): PlanTask {
  if (!next) {
    return {
      ...task,
      is_completed: false,
      solved_count: null,
      correct_count: null,
      wrong_count: null,
    };
  }
  return {
    ...task,
    is_completed: true,
    ...(data
      ? {
          solved_count: data.solved_count,
          correct_count: data.correct_count,
          wrong_count: data.wrong_count,
        }
      : {}),
  };
}

export function buildTaskUpdatePayload(
  next: boolean,
  data?: TaskSolutionData
): {
  is_completed: boolean;
  solved_count?: number | null;
  correct_count?: number | null;
  wrong_count?: number | null;
} {
  if (next) {
    return {
      is_completed: true,
      ...(data
        ? {
            solved_count: data.solved_count,
            correct_count: data.correct_count,
            wrong_count: data.wrong_count,
          }
        : {}),
    };
  }
  return {
    is_completed: false,
    solved_count: null,
    correct_count: null,
    wrong_count: null,
  };
}

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
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  solved_count: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  subject: { name: string } | { name: string }[] | null;
  topic: { name: string } | { name: string }[] | null;
  resource: { name: string } | { name: string }[] | null;
  resourceTopic: { name: string } | { name: string }[] | null;
}): PlanTask {
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topicRaw = row.topic;
  const topic = Array.isArray(topicRaw) ? topicRaw[0] ?? null : topicRaw;
  const resourceRaw = row.resource;
  const resource = Array.isArray(resourceRaw) ? resourceRaw[0] ?? null : resourceRaw;
  const resourceTopicRaw = row.resourceTopic;
  const resourceTopic = Array.isArray(resourceTopicRaw)
    ? resourceTopicRaw[0] ?? null
    : resourceTopicRaw;

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
    study_resource_id: row.study_resource_id,
    study_resource_topic_id: row.study_resource_topic_id,
    solved_count: row.solved_count,
    correct_count: row.correct_count,
    wrong_count: row.wrong_count,
    subject: subject as { name: string } | null,
    topic: topic as { name: string } | null,
    resource: resource as { name: string } | null,
    resourceTopic: resourceTopic as { name: string } | null,
  };
}

export const STUDY_PLAN_TASK_SELECT =
  "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, study_resource_id, study_resource_topic_id, solved_count, correct_count, wrong_count, subject:subjects(name), topic:topics(name), resource:study_resources(name), resourceTopic:study_resource_topics(name)";
