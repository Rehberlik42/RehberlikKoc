"use client";

import {
  dayLoadValue,
  densityTone,
  getTaskDurationMinutes,
  resolveDailyTarget,
  type DailyTargetUnit,
} from "@/lib/weekly-program-summary";
import type { MatrixTask } from "./matrix-grouping";

const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

function formatColumnDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function MatrixDayHeader({
  day,
  colIndex,
  dayTasks,
  dailyTargetMinutes,
  dailyTargetTasks,
  dailyTargetUnit,
  isToday,
}: {
  day: Date;
  colIndex: number;
  dayTasks: MatrixTask[];
  dailyTargetMinutes: number | null;
  dailyTargetTasks: number | null;
  dailyTargetUnit: DailyTargetUnit;
  isToday: boolean;
}) {
  const taskCount = dayTasks.length;
  const totalMinutes = dayTasks.reduce(
    (sum, t) => sum + getTaskDurationMinutes(t),
    0
  );
  const target = resolveDailyTarget({
    unit: dailyTargetUnit,
    minutes: dailyTargetMinutes,
    tasks: dailyTargetTasks,
  });
  const loadValue = dayLoadValue(dayTasks, dailyTargetUnit);
  const hasTarget = target != null && target > 0;
  const tone =
    hasTarget && loadValue > 0 ? densityTone(loadValue, target) : null;

  let minutesCls = "text-[var(--text-muted)]";
  if (tone === "amber") minutesCls = "text-[var(--warning)]";
  if (tone === "rose") minutesCls = "text-[var(--danger)]";

  return (
    <div
      className={`sticky top-0 z-20 border-b border-[var(--border)] px-2 py-1 text-center ${
        isToday ? "bg-[var(--primary)]/10" : "bg-[var(--surface)]"
      }`}
    >
      <p
        className={`text-xs font-bold ${
          isToday ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {DAY_SHORT[colIndex] ?? "—"}
      </p>
      <p className="text-[10px] leading-tight text-[var(--text-muted)]">
        {formatColumnDate(day)}
        {isToday ? (
          <span className="ml-1 text-[var(--primary)]">· Bugün</span>
        ) : null}
      </p>
      {taskCount > 0 ? (
        <p className={`mt-0.5 text-[10px] font-semibold leading-tight ${minutesCls}`}>
          {taskCount} görev
          {totalMinutes > 0 ? <> · {totalMinutes} dk</> : null}
        </p>
      ) : null}
    </div>
  );
}
