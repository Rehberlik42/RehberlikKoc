"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddTaskModal from "./AddTaskModal";
import type { ProgramSubject } from "./program-types";
import {
  Clock,
  Calendar,
  Loader2,
  CheckCheck,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plus,
} from "lucide-react";

export type { ProgramSubject } from "./program-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType = "ders" | "deneme" | "bras_deneme";
type ToastType = "success" | "error";

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

interface Props {
  studentId: string;
  subjects: ProgramSubject[];
}

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

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  type,
  message,
  onClose,
}: {
  type: ToastType;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
        type === "success"
          ? "border-green-500/30 bg-[#0d1f0d] text-green-400 shadow-green-500/10"
          : "border-red-500/30 bg-[#1f0d0d] text-red-400 shadow-red-500/10"
      }`}
    >
      {type === "success" ? (
        <CheckCheck className="h-4.5 w-4.5 shrink-0" />
      ) : (
        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ─── Board kartı ─────────────────────────────────────────────────────────────

function TaskCard({
  task,
  animate,
  onDelete,
  deletingId,
}: {
  task: PlanTask;
  animate: boolean;
  onDelete: (id: string) => void;
  deletingId: string | null;
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
      className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 transition-all duration-200 hover:border-[var(--border)] ${
        task.is_completed ? "opacity-60" : ""
      } ${animate ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300" : ""}`}
    >
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
        style={{ background: badge.color }}
      />

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        disabled={deletingId === task.id}
        className="absolute right-1.5 top-1.5 rounded-md border border-red-500/20 bg-red-500/10 p-1 text-red-400 opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100 disabled:opacity-50"
        aria-label="Görevi sil"
      >
        {deletingId === task.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </button>

      <div className="pl-1 pr-6">
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
          {task.is_completed && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Tamamlandı
            </span>
          )}
        </div>

        <p
          className={`mt-1.5 text-sm font-semibold leading-snug text-[var(--text-primary)] ${
            task.is_completed ? "line-through decoration-white/30" : ""
          }`}
        >
          {task.title}
        </p>

        {metaParts.length > 0 && (
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{metaParts.join(" · ")}</p>
        )}

        {hasTime && task.start_time && task.end_time && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 text-[var(--accent)]" />
              {formatTimeTR(task.start_time)} – {formatTimeTR(task.end_time)}
              {duration != null && (
                <span className="text-[var(--text-muted)]">· {duration} dk</span>
              )}
            </span>
            {task.break_minutes != null && task.break_minutes > 0 && (
              <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--accent)]">
                {task.break_minutes} dk mola
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TeacherWeeklyPlan({ studentId, subjects }: Props) {
  const supabase = createClient();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [addModal, setAddModal] = useState<{
    planDate: string;
    dayLabel: string;
  } | null>(null);
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

  const taskCountForDate = useCallback(
    (date: string) => (tasksByDate.get(date) ?? []).length,
    [tasksByDate]
  );

  const fetchTasks = useCallback(async () => {
    const client = createClient();
    setTasksLoading(true);
    const { data, error } = await client
      .from("study_plan_tasks")
      .select(
        "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, subject:subjects(name), topic:topics(name)"
      )
      .eq("student_id", studentId)
      .gte("plan_date", weekStartStr)
      .lte("plan_date", weekEndStr)
      .order("plan_date", { ascending: true })
      .order("order_index", { ascending: true })
      .order("start_time", { ascending: true });

    if (!error && data) {
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
  }, [studentId, weekStartStr, weekEndStr]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskAdded = useCallback(
    async (planDate: string) => {
      setToast({ type: "success", message: "Görev eklendi!" });
      const addedWeekStart = startOfWeek(new Date(planDate + "T12:00:00"));
      if (addedWeekStart.getTime() !== weekStart.getTime()) {
        setWeekStart(addedWeekStart);
      } else {
        await fetchTasks();
      }
    },
    [weekStart, fetchTasks]
  );

  const handleTaskError = useCallback((message: string) => {
    setToast({ type: "error", message });
  }, []);

  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId);
    const { error } = await supabase
      .from("study_plan_tasks")
      .delete()
      .eq("id", taskId);

    setDeletingId(null);

    if (error) {
      setToast({ type: "error", message: "Silme sırasında hata oluştu: " + error.message });
      return;
    }

    setToast({ type: "success", message: "Görev silindi." });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    seenTaskIds.current.delete(taskId);
  };

  const shouldAnimate = (id: string) => {
    if (seenTaskIds.current.has(id)) return false;
    seenTaskIds.current.add(id);
    return true;
  };

  const goToThisWeek = () => setWeekStart(startOfWeek(new Date()));
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));

  const openAddModal = (day: Date, colIndex: number) => {
    setAddModal({
      planDate: toISODate(day),
      dayLabel: `${DAY_LABELS_FULL[colIndex]}, ${formatColumnDate(day)}`,
    });
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {addModal && (
        <AddTaskModal
          onClose={() => setAddModal(null)}
          studentId={studentId}
          subjects={subjects}
          planDate={addModal.planDate}
          dayLabel={addModal.dayLabel}
          taskCountForDate={taskCountForDate}
          onSuccess={handleTaskAdded}
          onError={handleTaskError}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary-2)]/20 bg-gradient-to-br from-[var(--primary-2)]/30 to-[var(--primary-3)]/20">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Haftalık Program</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {tasks.length > 0 ? `${tasks.length} görev bu hafta` : "Bu hafta görev yok"}
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
                          <p className="text-center text-[10px] text-[var(--text-muted)]">görev yok</p>
                        </div>
                      ) : (
                        dayTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            animate={shouldAnimate(task.id)}
                            onDelete={handleDelete}
                            deletingId={deletingId}
                          />
                        ))
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddModal(day, colIndex)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-2 text-[11px] font-semibold text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.06] hover:text-[var(--accent)]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Görev Ekle
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border)] pt-4 text-[10px] text-[var(--text-muted)]">
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
