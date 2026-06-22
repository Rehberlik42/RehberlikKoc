"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Calendar, Flag, Sparkles, ArrowRight } from "lucide-react";
import TaskCard from "../program/_components/TaskCard";
import {
  TASK_TYPE_BADGE,
  applyTaskToggleOptimistic,
  buildTaskUpdatePayload,
  type PlanTask,
  type TaskSolutionData,
  type TaskType,
} from "../program/_components/plan-shared";

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    if (from === target) return;

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (target - from) * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
}

function DailyProgressRing({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const displayPct = useAnimatedNumber(pct);
  const allDone = total > 0 && completed === total;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0d0d2b]/60 p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#7B2FFF]/10 blur-[50px]" />

      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/40">
        Günlük İlerleme
      </p>

      <div className="flex flex-col items-center">
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 130 130" className="-rotate-90">
            <defs>
              <linearGradient id="todayRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7B2FFF" />
                <stop offset="50%" stopColor="#4F7CFF" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke={allDone ? "#22c55e" : "url(#todayRingGrad)"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-3xl font-black ${
                allDone
                  ? "text-green-400"
                  : "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-transparent"
              }`}
            >
              %{displayPct}
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-white/50">
          <span className="font-bold text-white">{completed}</span>
          <span className="text-white/30"> / </span>
          <span className="font-bold text-white">{total}</span>
          {" "}görev tamamlandı
        </p>
      </div>
    </div>
  );
}

function TodayGoalCard({ total }: { total: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0d0d2b]/60 p-6">
      <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-[#4F7CFF]/10 blur-[40px]" />
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
        Bugünkü Hedefin
      </p>
      <div className="relative mt-4 flex items-end gap-2">
        <span className="bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-5xl font-black text-transparent">
          {total}
        </span>
        <span className="mb-2 text-lg font-semibold text-white/50">görev</span>
      </div>
      <p className="mt-2 text-sm text-white/35">Planla, odaklan, ilerle!</p>
    </div>
  );
}

function MotivationCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#7B2FFF]/25 bg-gradient-to-br from-[#0d0d2b]/80 to-[#07070f]/80 p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#7B2FFF]/15 blur-[50px]" />
      <div className="relative flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#7B2FFF]/30 bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20">
          <Flag className="h-5 w-5 text-[#A78BFF]" />
        </div>
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#A78BFF]">
            <Sparkles className="h-3 w-3" />
            DORA
          </div>
          <blockquote className="text-sm font-semibold leading-relaxed text-white/80">
            &ldquo;Başarıya giden yol, bugün attığın adımlarda gizlidir. Her tamamladığın görev,
            hedefine bir adım daha yaklaşmanı sağlar.&rdquo;
          </blockquote>
          <p className="mt-2 text-[11px] text-white/30">– DORA</p>
        </div>
      </div>
    </div>
  );
}

export default function TodayTasks({
  initialTasks,
  todayDayName,
  todayDateLong,
}: {
  initialTasks: PlanTask[];
  todayDayName: string;
  todayDateLong: string;
}) {
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const seenTaskIds = useRef(new Set<string>());

  const completedCount = useMemo(
    () => tasks.filter((t) => t.is_completed).length,
    [tasks]
  );
  const totalCount = tasks.length;

  const handleToggleComplete = async (
    taskId: string,
    current: boolean,
    data?: TaskSolutionData
  ) => {
    const next = !current;
    const supabase = createClient();
    const prevTask = tasks.find((t) => t.id === taskId);

    setTogglingId(taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? applyTaskToggleOptimistic(t, next, data) : t
      )
    );

    const { error } = await supabase
      .from("study_plan_tasks")
      .update(buildTaskUpdatePayload(next, data))
      .eq("id", taskId);

    setTogglingId(null);

    if (error) {
      if (prevTask) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? prevTask : t))
        );
      }
      toast.error("Görev güncellenemedi: " + error.message);
      return;
    }

    toast.success(next ? "Görev tamamlandı!" : "Görev tekrar aktif");
  };

  const shouldAnimate = useCallback((id: string) => {
    if (seenTaskIds.current.has(id)) return false;
    seenTaskIds.current.add(id);
    return true;
  }, []);

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0d0d2b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            fontWeight: 600,
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#0d0d2b" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#0d0d2b" },
          },
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol kolon */}
        <div className="space-y-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#7B2FFF]/20 bg-gradient-to-br from-[#7B2FFF]/25 to-[#4F7CFF]/15">
              <Calendar className="h-4 w-4 text-[#A78BFF]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Bugün · {todayDayName}
              </h3>
              <p className="text-sm text-white/35">{todayDateLong}</p>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#0d0d2b]/40 px-6 py-12 text-center">
                <p className="text-sm text-white/40">Bugün için planlanmış görev yok</p>
                <Link
                  href="/dashboard/student/program"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#A78BFF] transition-colors hover:text-[#C4B5FF]"
                >
                  Haftalık Programa Git
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  animate={shouldAnimate(task.id)}
                  toggling={togglingId === task.id}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            )}
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-4 text-[10px] text-white/40">
              {(Object.entries(TASK_TYPE_BADGE) as [TaskType, { label: string; color: string }][]).map(
                ([type, { label, color }]) => (
                  <span key={type} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                )
              )}
            </div>
          )}

          <Link
            href="/dashboard/student/program"
            className="inline-flex items-center gap-2 rounded-xl border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-4 py-2.5 text-sm font-semibold text-[#A78BFF] transition-colors hover:bg-[#7B2FFF]/20"
          >
            Haftalık Programı Gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          <DailyProgressRing completed={completedCount} total={totalCount} />
          <TodayGoalCard total={totalCount} />
          <MotivationCard />
        </div>
      </div>
    </>
  );
}
