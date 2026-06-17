"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import {
  Clock,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  ListTodo,
} from "lucide-react";

type TaskType = "ders" | "deneme" | "bras_deneme";

interface PlanTask {
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

const DAY_LABELS_FULL = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

const TASK_TYPE_BADGE: Record<TaskType, { label: string; color: string }> = {
  ders: { label: "Ders", color: "#4F7CFF" },
  deneme: { label: "Deneme", color: "#A78BFF" },
  bras_deneme: { label: "Branş Denemesi", color: "#00D4FF" },
};

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = weekStart.toLocaleDateString("tr-TR", { month: "long" });
  const endMonth = weekEnd.toLocaleDateString("tr-TR", { month: "long" });
  const year = weekEnd.getFullYear();

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth} ${year}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
}

function formatColumnDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function formatTimeTR(time: string) {
  return time.slice(0, 5);
}

function calcDurationMinutes(start: string, end: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return null;
  return endMin - startMin;
}

function TaskCard({
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

export default function StudentWeeklyPlan() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const seenTaskIds = useRef(new Set<string>());

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekStartStr = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndStr = useMemo(() => toISODate(weekEnd), [weekEnd]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlanTask[]>();
    for (const task of tasks) {
      const list = map.get(task.plan_date) ?? [];
      list.push(task);
      map.set(task.plan_date, list);
    }
    return map;
  }, [tasks]);

  const fetchTasks = useCallback(async () => {
    const client = createClient();
    setTasksLoading(true);

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    const { data, error } = await client
      .from("study_plan_tasks")
      .select(
        "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, subject:subjects(name), topic:topics(name)"
      )
      .eq("student_id", user.id)
      .gte("plan_date", weekStartStr)
      .lte("plan_date", weekEndStr)
      .order("plan_date", { ascending: true })
      .order("order_index", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      toast.error("Görevler yüklenemedi: " + error.message);
      setTasksLoading(false);
      return;
    }

    if (data) {
      setTasks(
        data.map((row) => {
          const subjectRaw = row.subject;
          const subject = Array.isArray(subjectRaw)
            ? subjectRaw[0] ?? null
            : subjectRaw;
          const topicRaw = row.topic;
          const topic = Array.isArray(topicRaw)
            ? topicRaw[0] ?? null
            : topicRaw;
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
        })
      );
    }
    setTasksLoading(false);
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = async (taskId: string, current: boolean) => {
    const next = !current;
    const supabase = createClient();

    setTogglingId(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: next } : t))
    );

    const { error } = await supabase
      .from("study_plan_tasks")
      .update({ is_completed: next })
      .eq("id", taskId);

    setTogglingId(null);

    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: current } : t))
      );
      toast.error("Görev güncellenemedi: " + error.message);
      return;
    }

    toast.success(next ? "Görev tamamlandı!" : "Görev tekrar aktif");
  };

  const shouldAnimate = (id: string) => {
    if (seenTaskIds.current.has(id)) return false;
    seenTaskIds.current.add(id);
    return true;
  };

  const goToThisWeek = () => setWeekStart(startOfWeek(new Date()));
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));

  const completedCount = tasks.filter((t) => t.is_completed).length;

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

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d2b]/50">
        <div className="border-b border-white/5 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B2FFF]/20 bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20">
                <ListTodo className="h-4 w-4 text-[#A78BFF]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Öğretmenimden Görevler</h3>
                <p className="text-[11px] text-white/30">
                  {tasks.length > 0
                    ? `${completedCount}/${tasks.length} tamamlandı bu hafta`
                    : "Bu hafta atanmış görev yok"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPrevWeek}
                className="rounded-lg border border-white/8 bg-white/[0.04] p-2 text-white/50 transition-colors hover:border-[#7B2FFF]/30 hover:text-white"
                aria-label="Önceki hafta"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[10rem] text-center text-sm font-semibold text-white sm:min-w-[12rem]">
                {formatWeekRange(weekStart)}
              </span>
              <button
                type="button"
                onClick={goToNextWeek}
                className="rounded-lg border border-white/8 bg-white/[0.04] p-2 text-white/50 transition-colors hover:border-[#7B2FFF]/30 hover:text-white"
                aria-label="Sonraki hafta"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToThisWeek}
                className="rounded-lg border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-3 py-2 text-xs font-semibold text-[#A78BFF] transition-colors hover:bg-[#7B2FFF]/20"
              >
                Bu Hafta
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-16 text-white/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {weekDays.map((day, colIndex) => {
                const dateStr = toISODate(day);
                const dayTasks = tasksByDate.get(dateStr) ?? [];
                const todayCol = isToday(day);

                return (
                  <div
                    key={dateStr}
                    className={`flex min-h-[8rem] flex-col rounded-xl border p-2.5 transition-colors duration-300 ${
                      todayCol
                        ? "border-[#7B2FFF]/30 bg-[#7B2FFF]/[0.04] shadow-[0_0_20px_rgba(123,47,255,0.08)]"
                        : "border-white/6 bg-white/[0.02]"
                    }`}
                  >
                    <div className="mb-2 border-b border-white/5 pb-2">
                      <p
                        className={`text-xs font-bold ${
                          todayCol ? "text-[#A78BFF]" : "text-white/70"
                        }`}
                      >
                        {DAY_LABELS_FULL[colIndex]}
                      </p>
                      <p className="text-[10px] text-white/35">
                        {formatColumnDate(day)}
                        {todayCol && (
                          <span className="ml-1.5 text-[#7B2FFF]">· Bugün</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-1 flex-col gap-2">
                      {dayTasks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/8 px-2 py-6">
                          <p className="text-center text-[10px] text-white/25">görev yok</p>
                        </div>
                      ) : (
                        dayTasks.map((task) => (
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
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-white/5 pt-4 text-[10px] text-white/40">
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
        </div>
      </div>
    </>
  );
}
