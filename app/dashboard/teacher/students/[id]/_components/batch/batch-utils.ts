import type { ProgramSubject } from "../program-types";
import { densityTone, type DensityTone } from "@/lib/weekly-program-summary";
import { flattenSelectableTopics } from "@/lib/program/flatten-selectable-topics";

export type BatchTopicRow = {
  /** subjectId:topicId */
  key: string;
  subjectId: number;
  topicId: number;
  topicName: string;
  subjectName: string;
  label: string;
  /** Sekmeye özel rozet metni */
  badge?: string | null;
};

export type DistributeStrategy = "sirayla" | "hepsi-her-gune" | "tek-gune";

export type PlannedBatchTask = {
  /** Önizlemede satır çıkarma için kararlı anahtar */
  id: string;
  planDate: string;
  subjectId: number;
  topicId: number;
  topicName: string;
  subjectName: string;
  label: string;
};

/** Havuz / hızlı ekle — ortak yaprak konu düzleştirmesi */
export function flattenProgramTopics(
  subjects: ProgramSubject[]
): BatchTopicRow[] {
  return flattenSelectableTopics(subjects).map((row) => ({
    key: row.key,
    subjectId: row.subjectId,
    topicId: row.topicId,
    topicName: row.topicName,
    subjectName: row.subjectName,
    label: row.label,
  }));
}

export function distributeTopics(
  topics: BatchTopicRow[],
  selectedDates: string[],
  strategy: DistributeStrategy
): PlannedBatchTask[] {
  if (topics.length === 0 || selectedDates.length === 0) return [];

  const dates = [...selectedDates].sort();
  const planned: PlannedBatchTask[] = [];

  if (strategy === "tek-gune") {
    const date = dates[0];
    for (const topic of topics) {
      planned.push({
        id: `${date}:${topic.key}`,
        planDate: date,
        subjectId: topic.subjectId,
        topicId: topic.topicId,
        topicName: topic.topicName,
        subjectName: topic.subjectName,
        label: topic.label,
      });
    }
    return planned;
  }

  if (strategy === "hepsi-her-gune") {
    for (const date of dates) {
      for (const topic of topics) {
        planned.push({
          id: `${date}:${topic.key}`,
          planDate: date,
          subjectId: topic.subjectId,
          topicId: topic.topicId,
          topicName: topic.topicName,
          subjectName: topic.subjectName,
          label: topic.label,
        });
      }
    }
    return planned;
  }

  // sirayla — round-robin
  topics.forEach((topic, i) => {
    const date = dates[i % dates.length];
    planned.push({
      id: `${date}:${topic.key}:${i}`,
      planDate: date,
      subjectId: topic.subjectId,
      topicId: topic.topicId,
      topicName: topic.topicName,
      subjectName: topic.subjectName,
      label: topic.label,
    });
  });

  return planned;
}

export type DayLoadWarning = {
  dateStr: string;
  dayLabel: string;
  /** Birime göre toplam yük (görev veya dk) */
  totalLoad: number;
  target: number;
  unit: "task" | "minute";
  tone: DensityTone;
};

export function computeLoadWarnings(args: {
  planned: PlannedBatchTask[];
  durationMinutes: number;
  existingMinutesByDate: Map<string, number>;
  existingTaskCountByDate?: Map<string, number>;
  dailyTargetMinutes: number | null;
  dailyTargetTasks?: number | null;
  dailyTargetUnit?: "task" | "minute";
  dayLabelByDate: Map<string, string>;
}): DayLoadWarning[] {
  const {
    planned,
    durationMinutes,
    existingMinutesByDate,
    existingTaskCountByDate,
    dailyTargetMinutes,
    dailyTargetTasks = null,
    dailyTargetUnit = "minute",
    dayLabelByDate,
  } = args;

  const target =
    dailyTargetUnit === "task"
      ? dailyTargetTasks != null && dailyTargetTasks > 0
        ? dailyTargetTasks
        : null
      : dailyTargetMinutes != null && dailyTargetMinutes > 0
        ? dailyTargetMinutes
        : null;
  if (target == null) return [];

  const addedByDate = new Map<string, number>();
  for (const p of planned) {
    const add =
      dailyTargetUnit === "task" ? 1 : Math.max(0, durationMinutes);
    addedByDate.set(p.planDate, (addedByDate.get(p.planDate) ?? 0) + add);
  }

  const warnings: DayLoadWarning[] = [];
  for (const [dateStr, added] of addedByDate) {
    const existing =
      dailyTargetUnit === "task"
        ? (existingTaskCountByDate?.get(dateStr) ?? 0)
        : (existingMinutesByDate.get(dateStr) ?? 0);
    const total = existing + added;
    const tone = densityTone(total, target);
    if (tone !== "rose") continue;
    warnings.push({
      dateStr,
      dayLabel: dayLabelByDate.get(dateStr) ?? dateStr,
      totalLoad: total,
      target,
      unit: dailyTargetUnit,
      tone,
    });
  }

  return warnings.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

export const DAY_LABELS_SHORT = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
] as const;

export function summarizeDistribution(
  planned: PlannedBatchTask[],
  durationMinutes: number,
  dayLabelByDate: Map<string, string>
): string {
  const topicKeys = new Set(planned.map((p) => `${p.subjectId}:${p.topicId}`));
  const dates = [...new Set(planned.map((p) => p.planDate))].sort();
  const dayNames = dates
    .map((d) => dayLabelByDate.get(d) ?? d)
    .join(", ");

  const perDay = new Map<string, number>();
  for (const p of planned) {
    perDay.set(p.planDate, (perDay.get(p.planDate) ?? 0) + 1);
  }
  const counts = [...perDay.values()];
  const sameCount = counts.every((c) => c === counts[0]);
  const perDayLabel = sameCount
    ? `her güne ${counts[0] ?? 0} görev`
    : `toplam ${planned.length} görev`;

  const mins = Math.max(0, durationMinutes);
  return `${topicKeys.size} konu → ${dayNames || "—"} · ${perDayLabel}${
    mins > 0 ? ` · ${mins} dk` : ""
  }`;
}
