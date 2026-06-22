"use client";

import { Check, Clock, Loader2 } from "lucide-react";
import {
  TASK_TYPE_BADGE,
  calcDurationMinutes,
  formatTimeTR,
  type PlanTask,
} from "./plan-shared";

export default function TaskCard({
  task,
  animate,
  toggling,
  onToggleComplete,
}: {
  task: PlanTask;
  animate: boolean;
  toggling: boolean;
  onToggleComplete: (taskId: string, current: boolean) => void;
}) {
  const badge = TASK_TYPE_BADGE[task.task_type];
  const hasTime = Boolean(task.start_time && task.end_time);
  const duration =
    hasTime && task.start_time && task.end_time
      ? calcDurationMinutes(task.start_time, task.end_time)
      : null;

  const metaParts: string[] = [];
  if (task.subject?.name) metaParts.push(task.subject.name);
  if (task.topic?.name) metaParts.push(task.topic.name);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
        task.is_completed
          ? "border-green-500/25 bg-green-500/[0.06] opacity-75"
          : "border-white/8 bg-[#0d0d2b]/80 hover:border-white/12"
      } ${animate ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300" : ""}`}
    >
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl transition-colors duration-300"
        style={{
          background: task.is_completed ? "#22c55e" : badge.color,
        }}
      />

      <div className="flex gap-2.5 pl-1">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id, task.is_completed)}
          disabled={toggling}
          aria-label={task.is_completed ? "Tamamlanmadı olarak işaretle" : "Görevi tamamla"}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            task.is_completed
              ? "border-green-500 bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.35)]"
              : "border-white/25 bg-white/[0.04] text-transparent hover:border-[#7B2FFF] hover:bg-[#7B2FFF]/15"
          } disabled:opacity-50`}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
          ) : (
            <Check className={`h-3.5 w-3.5 ${task.is_completed ? "text-white" : ""}`} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                color: badge.color,
                backgroundColor: `${badge.color}18`,
                border: `1px solid ${badge.color}33`,
              }}
            >
              {badge.label}
            </span>
          </div>

          <p
            className={`mt-1.5 text-sm font-semibold leading-snug transition-all duration-300 ${
              task.is_completed
                ? "text-white/55 line-through decoration-green-500/40"
                : "text-white"
            }`}
          >
            {task.title}
          </p>

          {metaParts.length > 0 && (
            <p
              className={`mt-1 text-[11px] ${
                task.is_completed ? "text-white/30" : "text-white/40"
              }`}
            >
              {metaParts.join(" · ")}
            </p>
          )}

          {hasTime && task.start_time && task.end_time && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-white/45">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0 text-[#7AB3FF]" />
                {formatTimeTR(task.start_time)} – {formatTimeTR(task.end_time)}
                {duration != null && (
                  <span className="text-white/30">· {duration} dk</span>
                )}
              </span>
              {task.break_minutes != null && task.break_minutes > 0 && (
                <span className="rounded-full border border-[#70E6FF]/25 bg-[#70E6FF]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#70E6FF]">
                  {task.break_minutes} dk mola
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
