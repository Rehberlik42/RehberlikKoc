"use client";

import { useEffect, useState } from "react";
import { BookMarked, Check, Clock, Loader2 } from "lucide-react";
import {
  TASK_TYPE_BADGE,
  calcDurationMinutes,
  calcTaskNet,
  formatTimeTR,
  isResourceLinked,
  type PlanTask,
  type TaskSolutionData,
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
  onToggleComplete: (
    taskId: string,
    current: boolean,
    data?: TaskSolutionData
  ) => void;
}) {
  const badge = TASK_TYPE_BADGE[task.task_type];
  const linked = isResourceLinked(task);
  const hasTime = Boolean(task.start_time && task.end_time);
  const duration =
    hasTime && task.start_time && task.end_time
      ? calcDurationMinutes(task.start_time, task.end_time)
      : null;

  const [entryOpen, setEntryOpen] = useState(false);
  const [solved, setSolved] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");

  useEffect(() => {
    if (!entryOpen) return;
    setSolved(task.solved_count != null ? String(task.solved_count) : "");
    setCorrect(task.correct_count != null ? String(task.correct_count) : "");
    setWrong(task.wrong_count != null ? String(task.wrong_count) : "");
  }, [entryOpen, task.solved_count, task.correct_count, task.wrong_count]);

  useEffect(() => {
    if (task.is_completed) setEntryOpen(false);
  }, [task.is_completed]);

  const metaParts: string[] = [];
  if (task.subject?.name) metaParts.push(task.subject.name);
  if (task.topic?.name) metaParts.push(task.topic.name);

  const solvedNum = parseInt(solved, 10) || 0;
  const correctNum = parseInt(correct, 10) || 0;
  const wrongNum = parseInt(wrong, 10) || 0;
  const countWarning = correctNum + wrongNum > solvedNum && solvedNum > 0;
  const netPreview =
    correct !== "" || wrong !== ""
      ? calcTaskNet(correctNum, wrongNum)
      : null;

  const handleCompleteClick = () => {
    if (toggling) return;
    if (task.is_completed) {
      onToggleComplete(task.id, true);
      return;
    }
    if (linked) {
      setEntryOpen(true);
      return;
    }
    onToggleComplete(task.id, false);
  };

  const handleSubmitEntry = () => {
    onToggleComplete(task.id, false, {
      solved_count: solvedNum,
      correct_count: correctNum,
      wrong_count: wrongNum,
    });
    setEntryOpen(false);
  };

  const showSolutionSummary =
    task.is_completed &&
    task.solved_count != null &&
    task.solved_count > 0;

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
          onClick={handleCompleteClick}
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
            {linked && task.resource?.name && (
              <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#A78BFF]">
                <BookMarked className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{task.resource.name}</span>
              </span>
            )}
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

          {linked && task.resourceTopic?.name && (
            <p className="mt-1 text-[10px] text-[#A78BFF]/70">
              {task.resourceTopic.name}
            </p>
          )}

          {metaParts.length > 0 && (
            <p
              className={`mt-1 text-[11px] ${
                task.is_completed ? "text-white/30" : "text-white/40"
              }`}
            >
              {metaParts.join(" · ")}
            </p>
          )}

          {showSolutionSummary && (
            <p className="mt-1.5 text-[10px] font-medium text-white/45">
              {task.solved_count} soru · {task.correct_count ?? 0}D {task.wrong_count ?? 0}Y
              {task.correct_count != null && task.wrong_count != null && (
                <span className="text-white/30">
                  {" "}
                  · Net {calcTaskNet(task.correct_count, task.wrong_count).toFixed(2)}
                </span>
              )}
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

      {entryOpen && !task.is_completed && (
        <div className="mt-3 border-t border-white/8 pt-3 pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Çözüm girişi
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-white/35">Çözülen</span>
              <input
                type="number"
                min={0}
                value={solved}
                onChange={(e) => setSolved(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-center text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-white/35">Doğru</span>
              <input
                type="number"
                min={0}
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-center text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] text-white/35">Yanlış</span>
              <input
                type="number"
                min={0}
                value={wrong}
                onChange={(e) => setWrong(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 text-center text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
              />
            </label>
          </div>

          {countWarning && (
            <p className="mt-2 text-[10px] text-amber-400/90">
              Doğru + yanlış, çözülen sayısından fazla görünüyor.
            </p>
          )}

          {netPreview != null && (
            <p className="mt-2 text-[10px] text-white/40">
              Net önizleme:{" "}
              <span
                className={`font-semibold ${
                  netPreview >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {netPreview >= 0 ? "+" : ""}
                {netPreview.toFixed(2)}
              </span>
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEntryOpen(false)}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-xs font-semibold text-white/50 transition-colors hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmitEntry}
              disabled={toggling}
              className="flex-1 rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Tamamla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
