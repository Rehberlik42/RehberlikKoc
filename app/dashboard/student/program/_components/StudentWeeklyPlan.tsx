"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";
import TaskCard from "./TaskCard";
import {
  DAY_LABELS_FULL,
  TASK_TYPE_BADGE,
  STUDY_PLAN_TASK_SELECT,
  addDays,
  isToday,
  mapStudyPlanTaskRow,
  startOfWeek,
  toISODate,
  applyTaskToggleOptimistic,
  buildTaskUpdatePayload,
  type PlanTask,
  type TaskSolutionData,
  type TaskType,
} from "./plan-shared";
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
    [weekStart],
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
      .select(STUDY_PLAN_TASK_SELECT)
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
      setTasks(data.map(mapStudyPlanTaskRow));
    }
    setTasksLoading(false);
  }, [weekStartStr, weekEndStr]);
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
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
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-2)]/20">
                <ListTodo className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Öğretmenimden Görevler
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
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
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
                aria-label="Önceki hafta"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[10rem] text-center text-sm font-semibold text-[var(--text-primary)] sm:min-w-[12rem]">
                {formatWeekRange(weekStart)}
              </span>
              <button
                type="button"
                onClick={goToNextWeek}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
                aria-label="Sonraki hafta"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToThisWeek}
                className="rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--primary)]/20"
              >
                Bu Hafta
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
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
                        ? "border-[var(--primary)]/30 bg-[var(--primary)]/[0.04] shadow-[0_0_20px_rgba(123,47,255,0.08)]"
                        : "border-[var(--border)] bg-white/[0.02]"
                    }`}
                  >
                    <div className="mb-2 border-b border-[var(--border)] pb-2">
                      <p
                        className={`text-xs font-bold ${
                          todayCol ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {DAY_LABELS_FULL[colIndex]}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {formatColumnDate(day)}
                        {todayCol && (
                          <span className="ml-1.5 text-[var(--primary)]">· Bugün</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {dayTasks.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-2 py-6">
                          <p className="text-center text-[10px] text-[var(--text-muted)]">
                            görev yok
                          </p>
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border)] pt-4 text-[10px] text-[var(--text-muted)]">
            {(
              Object.entries(TASK_TYPE_BADGE) as [
                TaskType,
                { label: string; color: string },
              ][]
            ).map(([type, { label, color }]) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
