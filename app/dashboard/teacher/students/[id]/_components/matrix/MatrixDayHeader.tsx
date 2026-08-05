"use client";

import { densityTone, getTaskDurationMinutes } from "@/lib/weekly-program-summary";
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
  isToday,
}: {
  day: Date;
  colIndex: number;
  dayTasks: MatrixTask[];
  dailyTargetMinutes: number | null;
  isToday: boolean;
}) {
  const totalMinutes = dayTasks.reduce(
    (sum, t) => sum + getTaskDurationMinutes(t),
    0
  );
  const hasTarget = dailyTargetMinutes != null && dailyTargetMinutes > 0;
  const tone = hasTarget
    ? densityTone(totalMinutes, dailyTargetMinutes)
    : null;

  let minutesCls = "text-[var(--text-muted)]";
  if (tone === "amber") minutesCls = "text-[var(--warning)]";
  if (tone === "rose") minutesCls = "text-[var(--danger)]";

  return (
    <div
      className={`sticky top-0 z-20 border-b border-[var(--border)] px-2 py-2 text-center ${
        isToday
          ? "bg-[var(--primary)]/10"
          : "bg-[var(--surface)]"
      }`}
    >
      <p
        className={`text-xs font-bold ${
          isToday ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {DAY_SHORT[colIndex] ?? "—"}
      </p>
      <p className="text-[10px] text-[var(--text-muted)]">
        {formatColumnDate(day)}
        {isToday ? (
          <span className="ml-1 text-[var(--primary)]">· Bugün</span>
        ) : null}
      </p>
      {totalMinutes > 0 ? (
        <p className={`mt-0.5 text-[10px] font-semibold ${minutesCls}`}>
          {totalMinutes} dk
          {hasTarget ? (
            <span className="font-normal text-[var(--text-muted)]">
              {" "}
              / {dailyTargetMinutes}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">—</p>
      )}
    </div>
  );
}
