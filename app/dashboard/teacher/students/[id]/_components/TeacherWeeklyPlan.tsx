"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCachedProgramSubjects,
  loadProgramSubjects,
} from "@/lib/program/fetch-program-subjects";
import {
  modKeyLabel,
  shouldIgnoreGlobalShortcut,
} from "@/lib/program/form-keyboard";
import AddTaskModal, { type ExistingTask } from "./AddTaskModal";
import BatchComposer from "./batch/BatchComposer";
import type { DayQuickAddHandle } from "./quick-add/DayQuickAdd";
import WeeklyProgramSummaryModal from "./WeeklyProgramSummaryModal";
import SaveAsTemplateModal from "./SaveAsTemplateModal";
import ApplyTemplateModal from "./ApplyTemplateModal";
import type { ProgramSubject } from "./program-types";
import WeekMatrix from "./matrix/WeekMatrix";
import type { MatrixTask } from "./matrix/matrix-grouping";
import {
  Calendar,
  Loader2,
  CheckCheck,
  AlertCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  ClipboardList,
  BookmarkPlus,
  LayoutTemplate,
  Layers,
  Send,
  X,
  Pencil,
} from "lucide-react";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import { WEEKLY_PLAN_GUIDE } from "./weekly-plan-guide";

export type { ProgramSubject } from "./program-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType =
  | "ders"
  | "deneme"
  | "bras_deneme"
  | "soru_cozumu"
  | "video_izleme"
  | "tekrar"
  | "yanlis_analizi"
  | "odev"
  | "manuel"
  | "kitap_okuma";

type ToastType = "success" | "error";

type PlanTask = MatrixTask;

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
}

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

function addDaysISO(iso: string, n: number): string {
  return toISODate(addDays(new Date(iso + "T12:00:00"), n));
}

interface WeekDayOption {
  dateStr: string;
  label: string;
  sub: string;
}

type RawStudyPlanTask = {
  id: number;
  student_id: string;
  teacher_id: string;
  plan_date: string;
  subject_id: number | null;
  topic_id: number | null;
  task_type: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
  order_index: number;
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  details: Record<string, unknown> | null;
  is_published?: boolean;
};

type WeekConfirmDialog =
  | {
      kind: "copy-week";
      sourceCount: number;
      targetCount: number;
      rows: RawStudyPlanTask[];
    }
  | {
      kind: "clear-week";
      count: number;
    };

function buildTaskInsert(
  row: RawStudyPlanTask,
  planDate: string,
  orderIndex: number,
  overrides?: Partial<{
    title: string;
    details: Record<string, unknown>;
  }>
) {
  return {
    student_id: row.student_id,
    teacher_id: row.teacher_id,
    plan_date: planDate,
    subject_id: row.subject_id,
    topic_id: row.topic_id,
    task_type: row.task_type,
    title: overrides?.title ?? row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    break_minutes: row.break_minutes,
    order_index: orderIndex,
    is_completed: false,
    completed_at: null,
    study_resource_id: row.study_resource_id,
    study_resource_topic_id: row.study_resource_topic_id,
    details: overrides?.details ?? row.details ?? {},
    is_published: row.is_published ?? true,
  };
}

function coerceDetails(
  raw: Record<string, unknown> | null | undefined
): Record<string, string | number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

type SplitField = "planned_question_count" | "estimated_duration_minutes";

function resolveSplitAmount(
  details: Record<string, unknown> | null
): { field: SplitField; total: number } | null {
  if (!details) return null;
  const q = Number(details.planned_question_count);
  if (Number.isFinite(q) && q >= 2) {
    return { field: "planned_question_count", total: Math.floor(q) };
  }
  const m = Number(details.estimated_duration_minutes);
  if (Number.isFinite(m) && m >= 2) {
    return { field: "estimated_duration_minutes", total: Math.floor(m) };
  }
  return null;
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

// ─── Main component ────────────────────────────────────────────────────────────

export default function TeacherWeeklyPlan({ studentId }: Props) {
  const supabase = createClient();

  const [subjects, setSubjects] = useState<ProgramSubject[]>(
    () => getCachedProgramSubjects() ?? []
  );
  const [subjectsLoading, setSubjectsLoading] = useState(
    () => getCachedProgramSubjects() == null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [addModal, setAddModal] = useState<{
    planDate: string;
    dayLabel: string;
    existingTask?: ExistingTask | null;
    initialSubjectId?: number | null;
  } | null>(null);
  const [weekConfirm, setWeekConfirm] = useState<WeekConfirmDialog | null>(
    null
  );
  const [weekActionLoading, setWeekActionLoading] = useState(false);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number | null>(
    null
  );
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState("");
  const [targetSaving, setTargetSaving] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const dayQuickAddRefs = useRef(new Map<string, DayQuickAddHandle>());
  const pendingSplitRef = useRef<{
    taskId: string;
    row: RawStudyPlanTask;
    field: SplitField;
    keep: number;
    move: number;
  } | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekStartStr = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndStr = useMemo(() => toISODate(weekEnd), [weekEnd]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekDateStrs = useMemo(
    () => weekDays.map((d) => toISODate(d)),
    [weekDays]
  );

  const weekDayOptions = useMemo<WeekDayOption[]>(
    () =>
      weekDays.map((d, i) => ({
        dateStr: toISODate(d),
        label: DAY_LABELS_FULL[i],
        sub: formatColumnDate(d),
      })),
    [weekDays]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlanTask[]>();
    for (const task of tasks) {
      const list = map.get(task.plan_date) ?? [];
      list.push(task);
      map.set(task.plan_date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.order_index - b.order_index);
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
        "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, is_published, details, subject_id, topic_id, subject:subjects(name), topic:topics(name)"
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
            id: String(row.id),
            plan_date: row.plan_date,
            task_type: row.task_type as TaskType,
            title: row.title,
            start_time: row.start_time,
            end_time: row.end_time,
            break_minutes: row.break_minutes,
            order_index: row.order_index,
            is_completed: row.is_completed,
            is_published: row.is_published !== false,
            subject_id:
              typeof row.subject_id === "number" ? row.subject_id : null,
            topic_id: typeof row.topic_id === "number" ? row.topic_id : null,
            subject: subject as { name: string } | null,
            topic: topic as { name: string } | null,
            details: coerceDetails(
              row.details as Record<string, unknown> | null
            ),
          };
        })
      );
    }
    setTasksLoading(false);
  }, [studentId, weekStartStr, weekEndStr]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("daily_target_minutes")
        .eq("id", studentId)
        .maybeSingle();
      if (cancelled) return;
      const raw = data?.daily_target_minutes;
      setDailyTargetMinutes(
        typeof raw === "number" && Number.isFinite(raw) ? raw : null
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, studentId]);

  const saveDailyTarget = useCallback(async () => {
    const parsed = targetDraft.trim() === "" ? null : Number(targetDraft);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      setToast({ type: "error", message: "Geçerli bir dakika değeri gir." });
      return;
    }
    const next = parsed == null ? null : Math.round(parsed);
    const prev = dailyTargetMinutes;
    setDailyTargetMinutes(next);
    setEditingTarget(false);
    setTargetSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_target_minutes: next })
      .eq("id", studentId);
    setTargetSaving(false);
    if (error) {
      setDailyTargetMinutes(prev);
      setToast({
        type: "error",
        message: "Günlük hedef kaydedilemedi: " + error.message,
      });
      return;
    }
    setToast({
      type: "success",
      message:
        next == null
          ? "Günlük hedef kaldırıldı"
          : `Günlük hedef ${next} dk olarak kaydedildi`,
    });
  }, [targetDraft, dailyTargetMinutes, supabase, studentId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (getCachedProgramSubjects()) {
      setSubjects(getCachedProgramSubjects()!);
      setSubjectsLoading(false);
      return;
    }
    let cancelled = false;
    setSubjectsLoading(true);
    void loadProgramSubjects()
      .then((data) => {
        if (!cancelled) {
          setSubjects(data);
          setSubjectsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSubjectsLoading(false);
        setToast({
          type: "error",
          message:
            "Ders/konu listesi yüklenemedi: " +
            (err instanceof Error ? err.message : "bilinmeyen hata"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTaskAdded = useCallback(
    async (planDate: string) => {
      const wasEdit = Boolean(addModal?.existingTask);
      setToast({
        type: "success",
        message: wasEdit ? "Görev güncellendi!" : "Görev eklendi!",
      });
      const addedWeekStart = startOfWeek(new Date(planDate + "T12:00:00"));
      if (addedWeekStart.getTime() !== weekStart.getTime()) {
        setWeekStart(addedWeekStart);
      } else {
        await fetchTasks();
      }
    },
    [weekStart, fetchTasks, addModal?.existingTask]
  );

  const handleTaskError = useCallback((message: string) => {
    setToast({ type: "error", message });
  }, []);

  /** Hızlı ekleme: toast yok — ardışık girişi kesmesin */
  const handleQuickAddSuccess = useCallback(
    (planDate: string) => {
      void (async () => {
        const addedWeekStart = startOfWeek(new Date(planDate + "T12:00:00"));
        if (addedWeekStart.getTime() !== weekStart.getTime()) {
          setWeekStart(addedWeekStart);
        } else {
          await fetchTasks();
        }
      })();
    },
    [weekStart, fetchTasks]
  );

  // Grid: N → odaklı gün / bugün / ilk gün hızlı ekleme
  useEffect(() => {
    if (batchMode || addModal || weekConfirm) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (shouldIgnoreGlobalShortcut(e.target)) return;
      // Açık panel/modal (AddTask vs.) — effect zaten erken çıkıyor; ek güvenlik
      if (document.querySelector('[role="dialog"]')) return;

      const focusedDay = document.activeElement?.closest(
        "[data-plan-date]"
      ) as HTMLElement | null;
      const focusedDate = focusedDay?.getAttribute("data-plan-date");
      const todayStr = toISODate(new Date());
      const target =
        (focusedDate && weekDateStrs.includes(focusedDate)
          ? focusedDate
          : null) ??
        (weekDateStrs.includes(todayStr) ? todayStr : null) ??
        weekDateStrs[0];

      if (!target) return;
      e.preventDefault();
      dayQuickAddRefs.current.get(target)?.open();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    batchMode,
    addModal,
    weekConfirm,
    weekDateStrs,
  ]);

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
  };

  const fetchRawTask = useCallback(
    async (taskId: string) => {
      const { data, error } = await supabase
        .from("study_plan_tasks")
        .select("*")
        .eq("id", taskId)
        .single();
      if (error || !data) return { row: null, error };
      return { row: data as RawStudyPlanTask, error: null };
    },
    [supabase]
  );

  const countTasksOnDate = useCallback(
    async (date: string) => {
      const { count, error } = await supabase
        .from("study_plan_tasks")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("plan_date", date);
      if (error) return null;
      return count ?? 0;
    },
    [supabase, studentId]
  );

  const dayLabelForDate = useCallback(
    (dateStr: string) => {
      const idx = weekDateStrs.indexOf(dateStr);
      if (idx >= 0) {
        return `${DAY_LABELS_FULL[idx]}, ${formatColumnDate(weekDays[idx])}`;
      }
      const d = new Date(dateStr + "T12:00:00");
      return formatColumnDate(d);
    },
    [weekDateStrs, weekDays]
  );

  const handleEditTask = useCallback(
    async (taskId: string) => {
      setMenuBusy(true);
      try {
        const { row, error } = await fetchRawTask(taskId);
        if (error || !row) {
          setToast({
            type: "error",
            message: "Görev okunamadı: " + (error?.message ?? ""),
          });
          return;
        }
        setAddModal({
          planDate: row.plan_date,
          dayLabel: dayLabelForDate(row.plan_date),
          existingTask: {
            id: String(row.id),
            task_type: row.task_type as ExistingTask["task_type"],
            subject_id: row.subject_id,
            topic_id: row.topic_id,
            study_resource_id: row.study_resource_id,
            study_resource_topic_id: row.study_resource_topic_id,
            title: row.title,
            details: coerceDetails(row.details),
          },
        });
      } finally {
        setMenuBusy(false);
      }
    },
    [fetchRawTask, dayLabelForDate]
  );

  const handleCopyTask = useCallback(
    async (taskId: string) => {
      setMenuBusy(true);
      try {
        const { row, error } = await fetchRawTask(taskId);
        if (error || !row) {
          setToast({
            type: "error",
            message: "Kopyalanacak görev okunamadı: " + (error?.message ?? ""),
          });
          return;
        }
        const orderIndex = taskCountForDate(row.plan_date);
        const { error: insertError } = await supabase
          .from("study_plan_tasks")
          .insert(buildTaskInsert(row, row.plan_date, orderIndex));
        if (insertError) {
          setToast({
            type: "error",
            message: "Kopyalama başarısız: " + insertError.message,
          });
          return;
        }
        setToast({ type: "success", message: "Görev kopyalandı." });
        await fetchTasks();
      } finally {
        setMenuBusy(false);
      }
    },
    [fetchRawTask, taskCountForDate, supabase, fetchTasks]
  );

  const handlePrepareSplit = useCallback(
    async (taskId: string) => {
      setMenuBusy(true);
      try {
        const { row, error } = await fetchRawTask(taskId);
        if (error || !row) {
          setToast({
            type: "error",
            message: "Görev okunamadı: " + (error?.message ?? ""),
          });
          pendingSplitRef.current = null;
          return false;
        }
        const amount = resolveSplitAmount(row.details);
        if (!amount) {
          setToast({
            type: "error",
            message:
              "Bu görevde bölünecek sayısal bir miktar yok (soru sayısı/süre girilmemiş)",
          });
          pendingSplitRef.current = null;
          return false;
        }
        const keep = Math.ceil(amount.total / 2);
        const move = Math.floor(amount.total / 2);
        pendingSplitRef.current = {
          taskId,
          row,
          field: amount.field,
          keep,
          move,
        };
        return true;
      } finally {
        setMenuBusy(false);
      }
    },
    [fetchRawTask]
  );

  const handleSplitTask = useCallback(
    async (taskId: string, dateStr: string) => {
      setMenuBusy(true);
      try {
        let pending = pendingSplitRef.current;
        if (!pending || pending.taskId !== taskId) {
          const { row, error } = await fetchRawTask(taskId);
          if (error || !row) {
            setToast({
              type: "error",
              message: "Görev okunamadı: " + (error?.message ?? ""),
            });
            return;
          }
          const amount = resolveSplitAmount(row.details);
          if (!amount) {
            setToast({
              type: "error",
              message:
                "Bu görevde bölünecek sayısal bir miktar yok (soru sayısı/süre girilmemiş)",
            });
            return;
          }
          pending = {
            taskId,
            row,
            field: amount.field,
            keep: Math.ceil(amount.total / 2),
            move: Math.floor(amount.total / 2),
          };
          pendingSplitRef.current = pending;
        }

        const { row, field, keep, move } = pending;
        const baseDetails = {
          ...(row.details && typeof row.details === "object" ? row.details : {}),
        } as Record<string, unknown>;

        const originalDetails = { ...baseDetails, [field]: keep };
        const splitDetails = { ...baseDetails, [field]: move };
        const orderIndex = taskCountForDate(dateStr);
        const continueTitle = row.title.endsWith("(devam)")
          ? row.title
          : `${row.title} (devam)`;

        const { error: updateError } = await supabase
          .from("study_plan_tasks")
          .update({ details: originalDetails })
          .eq("id", row.id);

        if (updateError) {
          setToast({
            type: "error",
            message: "Bölme başarısız: " + updateError.message,
          });
          return;
        }

        const { error: insertError } = await supabase
          .from("study_plan_tasks")
          .insert(
            buildTaskInsert(row, dateStr, orderIndex, {
              title: continueTitle,
              details: splitDetails,
            })
          );

        if (insertError) {
          // Orijinal miktarı geri al
          await supabase
            .from("study_plan_tasks")
            .update({ details: row.details ?? {} })
            .eq("id", row.id);
          setToast({
            type: "error",
            message: "Bölme başarısız: " + insertError.message,
          });
          return;
        }

        pendingSplitRef.current = null;
        setToast({ type: "success", message: "Görev bölündü" });
        await fetchTasks();
      } finally {
        setMenuBusy(false);
      }
    },
    [fetchRawTask, taskCountForDate, supabase, fetchTasks]
  );

  const handleMoveTask = useCallback(
    async (taskId: string, dateStr: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.plan_date === dateStr) return;

      setMenuBusy(true);
      const prevTasks = tasks;
      const orderIndex = taskCountForDate(dateStr);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, plan_date: dateStr, order_index: orderIndex }
            : t
        )
      );

      const { error } = await supabase
        .from("study_plan_tasks")
        .update({ plan_date: dateStr, order_index: orderIndex })
        .eq("id", taskId);

      setMenuBusy(false);

      if (error) {
        setTasks(prevTasks);
        setToast({
          type: "error",
          message: "Taşıma başarısız: " + error.message,
        });
        return;
      }
      setToast({ type: "success", message: "Görev taşındı." });
    },
    [tasks, taskCountForDate, supabase]
  );

  const handleRepeatTask = useCallback(
    async (taskId: string, weeks: number) => {
      const n = Math.min(12, Math.max(1, weeks));
      setMenuBusy(true);
      try {
        const { row, error } = await fetchRawTask(taskId);
        if (error || !row) {
          setToast({
            type: "error",
            message: "Tekrarlanacak görev okunamadı: " + (error?.message ?? ""),
          });
          return;
        }

        const payloads: ReturnType<typeof buildTaskInsert>[] = [];
        for (let i = 1; i <= n; i++) {
          const planDate = addDaysISO(row.plan_date, 7 * i);
          const count = await countTasksOnDate(planDate);
          if (count === null) {
            setToast({
              type: "error",
              message: "Tekrar tarihleri hazırlanamadı.",
            });
            return;
          }
          payloads.push(buildTaskInsert(row, planDate, count));
        }

        const results = await Promise.all(
          payloads.map((p) => supabase.from("study_plan_tasks").insert(p))
        );
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) {
          setToast({
            type: "error",
            message: "Tekrarlama başarısız: " + firstError.message,
          });
          return;
        }

        setToast({
          type: "success",
          message: `${n} hafta boyunca tekrarlandı`,
        });
        await fetchTasks();
      } finally {
        setMenuBusy(false);
      }
    },
    [fetchRawTask, countTasksOnDate, supabase, fetchTasks]
  );

  const persistPositions = useCallback(
    async (
      updates: { id: string; plan_date?: string; order_index: number }[]
    ) => {
      const results = await Promise.all(
        updates.map((u) => {
          const payload: { order_index: number; plan_date?: string } = {
            order_index: u.order_index,
          };
          if (u.plan_date !== undefined) payload.plan_date = u.plan_date;
          return supabase
            .from("study_plan_tasks")
            .update(payload)
            .eq("id", u.id);
        })
      );
      return results.find((r) => r.error)?.error ?? null;
    },
    [supabase]
  );

  const goToThisWeek = () => setWeekStart(startOfWeek(new Date()));
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));

  const executeCopyWeek = useCallback(
    async (rows: RawStudyPlanTask[]) => {
      setWeekActionLoading(true);
      try {
        const results = await Promise.all(
          rows.map(async (row) => {
            const targetDate = addDaysISO(row.plan_date, 7);
            const payload = {
              ...buildTaskInsert(row, targetDate, row.order_index),
              is_published: draftMode ? false : (row.is_published ?? true),
            };
            const { error } = await supabase
              .from("study_plan_tasks")
              .insert(payload);
            if (error) throw error;
            return true;
          })
        );
        setToast({
          type: "success",
          message: `${results.length} görev sonraki haftaya kopyalandı`,
        });
        setWeekConfirm(null);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" &&
                err &&
                "message" in err &&
                typeof (err as { message: unknown }).message === "string"
              ? (err as { message: string }).message
              : "Kopyalama başarısız";
        setToast({ type: "error", message: "Hafta kopyalanamadı: " + message });
      } finally {
        setWeekActionLoading(false);
      }
    },
    [supabase, draftMode]
  );

  const handleCopyWeekClick = useCallback(async () => {
    if (weekActionLoading) return;
    setWeekActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("study_plan_tasks")
        .select("*")
        .eq("student_id", studentId)
        .gte("plan_date", weekStartStr)
        .lte("plan_date", weekEndStr)
        .order("plan_date", { ascending: true })
        .order("order_index", { ascending: true });

      if (error) {
        setToast({
          type: "error",
          message: "Görevler okunamadı: " + error.message,
        });
        return;
      }

      const rows = (data ?? []) as RawStudyPlanTask[];
      if (rows.length === 0) {
        setToast({
          type: "error",
          message: "Bu haftada kopyalanacak görev yok",
        });
        return;
      }

      const nextStart = toISODate(addDays(weekStart, 7));
      const nextEnd = toISODate(addDays(weekStart, 13));
      const { count, error: countError } = await supabase
        .from("study_plan_tasks")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .gte("plan_date", nextStart)
        .lte("plan_date", nextEnd);

      if (countError) {
        setToast({
          type: "error",
          message: "Hedef hafta kontrol edilemedi: " + countError.message,
        });
        return;
      }

      const targetCount = count ?? 0;
      if (targetCount > 0) {
        setWeekConfirm({
          kind: "copy-week",
          sourceCount: rows.length,
          targetCount,
          rows,
        });
        return;
      }

      await executeCopyWeek(rows);
    } finally {
      setWeekActionLoading(false);
    }
  }, [
    weekActionLoading,
    supabase,
    studentId,
    weekStartStr,
    weekEndStr,
    weekStart,
    executeCopyWeek,
  ]);

  const handleClearWeekClick = useCallback(() => {
    if (tasks.length === 0) {
      setToast({
        type: "error",
        message: "Bu haftada silinecek görev yok",
      });
      return;
    }
    setWeekConfirm({ kind: "clear-week", count: tasks.length });
  }, [tasks.length]);

  const draftTaskCount = useMemo(
    () => tasks.filter((t) => t.is_published === false).length,
    [tasks]
  );

  const handlePublishWeek = useCallback(async () => {
    if (publishing || draftTaskCount === 0) return;
    setPublishing(true);
    try {
      const { error, count } = await supabase
        .from("study_plan_tasks")
        .update({ is_published: true }, { count: "exact" })
        .eq("student_id", studentId)
        .gte("plan_date", weekStartStr)
        .lte("plan_date", weekEndStr)
        .eq("is_published", false);

      if (error) {
        setToast({
          type: "error",
          message: "Yayınlama başarısız: " + error.message,
        });
        return;
      }

      setToast({
        type: "success",
        message: `${count ?? draftTaskCount} taslak görev yayınlandı`,
      });
      await fetchTasks();
    } finally {
      setPublishing(false);
    }
  }, [
    publishing,
    draftTaskCount,
    supabase,
    studentId,
    weekStartStr,
    weekEndStr,
    fetchTasks,
  ]);

  const executeClearWeek = useCallback(async () => {
    setWeekActionLoading(true);
    try {
      const { error } = await supabase
        .from("study_plan_tasks")
        .delete()
        .eq("student_id", studentId)
        .gte("plan_date", weekStartStr)
        .lte("plan_date", weekEndStr);

      if (error) {
        setToast({
          type: "error",
          message: "Temizleme başarısız: " + error.message,
        });
        return;
      }

      setToast({
        type: "success",
        message: "Bu haftanın programı temizlendi",
      });
      setWeekConfirm(null);
      await fetchTasks();
    } finally {
      setWeekActionLoading(false);
    }
  }, [supabase, studentId, weekStartStr, weekEndStr, fetchTasks]);

  const confirmWeekAction = useCallback(async () => {
    if (!weekConfirm) return;
    if (weekConfirm.kind === "copy-week") {
      await executeCopyWeek(weekConfirm.rows);
      return;
    }
    await executeClearWeek();
  }, [weekConfirm, executeCopyWeek, executeClearWeek]);

  const openAddModal = (dateStr: string, subjectId: number | null) => {
    const idx = weekDateStrs.indexOf(dateStr);
    const dayLabel =
      idx >= 0
        ? `${DAY_LABELS_FULL[idx]}, ${formatColumnDate(weekDays[idx])}`
        : dateStr;
    setAddModal({
      planDate: dateStr,
      dayLabel,
      existingTask: null,
      initialSubjectId: subjectId,
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
          existingTask={addModal.existingTask}
          weekDays={addModal.existingTask ? undefined : weekDays}
          draftMode={draftMode}
          initialSubjectId={
            addModal.existingTask ? null : (addModal.initialSubjectId ?? null)
          }
        />
      )}

      <WeeklyProgramSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        tasks={tasks}
        weekStart={weekStart}
        weekRangeLabel={formatWeekRange(weekStart)}
        dailyTargetMinutes={dailyTargetMinutes}
      />

      <SaveAsTemplateModal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        studentId={studentId}
        weekStartStr={weekStartStr}
        weekEndStr={weekEndStr}
        weekRangeLabel={formatWeekRange(weekStart)}
        sourceTaskCount={tasks.length}
        onSuccess={(message) =>
          setToast({ type: "success", message })
        }
        onError={(message) => setToast({ type: "error", message })}
      />

      <ApplyTemplateModal
        open={applyTemplateOpen}
        onClose={() => setApplyTemplateOpen(false)}
        studentId={studentId}
        weekDateStrs={weekDateStrs}
        weekRangeLabel={formatWeekRange(weekStart)}
        existingTaskCount={tasks.length}
        taskCountForDate={taskCountForDate}
        draftMode={draftMode}
        onSuccess={(message) => {
          setToast({ type: "success", message });
          void fetchTasks();
        }}
        onError={(message) => setToast({ type: "error", message })}
      />

      {weekConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Modalı kapat"
            onClick={() => !weekActionLoading && setWeekConfirm(null)}
            className="fixed inset-0 bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            className={`relative w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl duration-200 ${
              weekConfirm.kind === "clear-week"
                ? "border-rose-500/25"
                : "border-amber-500/25"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${
                weekConfirm.kind === "clear-week"
                  ? "border-rose-500/20"
                  : "border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    weekConfirm.kind === "clear-week"
                      ? "border-rose-500/30 bg-rose-500/10"
                      : "border-amber-500/30 bg-amber-500/10"
                  }`}
                >
                  {weekConfirm.kind === "clear-week" ? (
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {weekConfirm.kind === "clear-week"
                    ? "Programı Temizle?"
                    : "Sonraki haftaya kopyala?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !weekActionLoading && setWeekConfirm(null)}
                disabled={weekActionLoading}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              {weekConfirm.kind === "clear-week" ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Bu haftadaki{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {weekConfirm.count} görevin
                    </span>{" "}
                    tamamı silinecek.
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                    Bu işlem geri alınamaz. Diğer haftalar etkilenmez.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Sonraki haftada zaten{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {weekConfirm.targetCount} görev
                    </span>{" "}
                    var. Kopyalanan{" "}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {weekConfirm.sourceCount} görev
                    </span>{" "}
                    bunlara{" "}
                    <span className="font-semibold text-amber-200">
                      EKLENECEK
                    </span>{" "}
                    (üzerine yazılmayacak).
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                    Devam edilsin mi?
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3 border-t border-[var(--border)] px-5 py-4">
              <button
                type="button"
                onClick={() => setWeekConfirm(null)}
                disabled={weekActionLoading}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmWeekAction}
                disabled={weekActionLoading}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-[var(--text-primary)] transition-colors disabled:opacity-50 ${
                  weekConfirm.kind === "clear-week"
                    ? "bg-rose-600/90 hover:bg-rose-600"
                    : "bg-amber-600/90 hover:bg-amber-600"
                }`}
              >
                {weekActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : weekConfirm.kind === "clear-week" ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {weekConfirm.kind === "clear-week" ? "Evet, Temizle" : "Evet, Kopyala"}
              </button>
            </div>
          </div>
        </div>
      )}

      {batchMode ? (
        <BatchComposer
          studentId={studentId}
          subjects={subjects}
          weekDays={weekDays}
          tasks={tasks}
          taskCountForDate={taskCountForDate}
          dailyTargetMinutes={dailyTargetMinutes}
          draftMode={draftMode}
          onClose={() => setBatchMode(false)}
          onSuccess={(count) => {
            setBatchMode(false);
            setToast({
              type: "success",
              message: `${count} görev eklendi`,
            });
            void fetchTasks();
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      ) : (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
        <div className="border-b border-[var(--border)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary-2)]/20 bg-gradient-to-br from-[var(--primary-2)]/30 to-[var(--primary-3)]/20">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Haftalık Program
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {tasks.length > 0
                    ? `${tasks.length} görev bu hafta · tutamacı sürükleyerek taşı`
                    : "Bu hafta görev yok"}
                </p>
                <div className="mt-1.5">
                  {editingTarget ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Günlük Hedef:
                      </span>
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={targetDraft}
                        onChange={(e) => setTargetDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveDailyTarget();
                          }
                          if (e.key === "Escape") {
                            setEditingTarget(false);
                          }
                        }}
                        className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-primary)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]/40"
                        placeholder="dk"
                        disabled={targetSaving}
                      />
                      <span className="text-[11px] text-[var(--text-muted)]">dk</span>
                      <button
                        type="button"
                        onClick={() => void saveDailyTarget()}
                        disabled={targetSaving}
                        className="rounded-md bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--primary)]/30 disabled:opacity-50"
                      >
                        {targetSaving ? "…" : "Kaydet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTarget(false)}
                        disabled={targetSaving}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetDraft(
                          dailyTargetMinutes != null
                            ? String(dailyTargetMinutes)
                            : ""
                        );
                        setEditingTarget(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      Günlük Hedef:{" "}
                      {dailyTargetMinutes != null
                        ? `${dailyTargetMinutes} dk`
                        : "tanımsız"}
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <HelpGuideButton
                title={WEEKLY_PLAN_GUIDE.title}
                sections={WEEKLY_PLAN_GUIDE.sections}
                className="h-9 w-9 rounded-lg border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--accent)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/20 hover:text-[var(--accent)]"
              />
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
              <div className="mx-0.5 hidden h-6 w-px bg-[var(--border)] sm:block" />
              <button
                type="button"
                onClick={() => setBatchMode(true)}
                disabled={subjectsLoading || subjects.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Layers className="h-3.5 w-3.5" />
                Toplu Ekle
              </button>
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  draftMode
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={draftMode}
                  onChange={(e) => setDraftMode(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[var(--border)] accent-amber-400"
                />
                Taslak Modu
              </label>
              <button
                type="button"
                onClick={() => void handlePublishWeek()}
                disabled={publishing || draftTaskCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  draftTaskCount === 0
                    ? "Yayınlanacak taslak yok"
                    : `${draftTaskCount} taslağı yayınla`
                }
              >
                {publishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Yayınla
                {draftTaskCount > 0 ? ` (${draftTaskCount})` : ""}
              </button>
              <button
                type="button"
                onClick={() => setSummaryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--primary)]/20"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Özet
              </button>
              <button
                type="button"
                onClick={() => setSaveTemplateOpen(true)}
                disabled={tasks.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  tasks.length === 0
                    ? "Kaydedilecek görev yok"
                    : undefined
                }
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Şablon Olarak Kaydet
              </button>
              <button
                type="button"
                onClick={() => setApplyTemplateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                Şablondan Oluştur
              </button>
              <button
                type="button"
                onClick={handleCopyWeekClick}
                disabled={weekActionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {weekActionLoading && !weekConfirm ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Haftayı Kopyala
              </button>
              <button
                type="button"
                onClick={handleClearWeekClick}
                disabled={weekActionLoading || tasks.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                title={
                  tasks.length === 0
                    ? "Bu haftada silinecek görev yok"
                    : undefined
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Programı Temizle
              </button>
            </div>
          </div>
        </div>

        <div className={`p-4 ${addModal ? "lg:mr-[400px]" : ""}`}>
          {subjectsLoading || tasksLoading ? (
            <div className="overflow-auto rounded-xl border border-[var(--border)] animate-pulse">
              <div
                className="min-w-[56rem]"
                style={{
                  display: "grid",
                  gridTemplateColumns: "9.5rem repeat(7, minmax(7rem, 1fr))",
                }}
              >
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 border-b border-r border-[var(--border)] bg-[var(--surface-2)]"
                  />
                ))}
              </div>
            </div>
          ) : (
            <WeekMatrix
              weekDays={weekDays}
              tasks={tasks}
              subjects={subjects}
              dailyTargetMinutes={dailyTargetMinutes}
              studentId={studentId}
              draftMode={draftMode}
              deletingId={deletingId}
              menuBusy={menuBusy}
              weekDayOptions={weekDayOptions}
              taskCountForDate={taskCountForDate}
              onTasksChange={setTasks}
              persistPositions={persistPositions}
              onPersistError={(message) =>
                setToast({ type: "error", message })
              }
              onAddTask={openAddModal}
              onQuickAddSuccess={handleQuickAddSuccess}
              onQuickAddError={handleTaskError}
              quickAddRef={(dateStr, handle) => {
                if (handle) dayQuickAddRefs.current.set(dateStr, handle);
                else dayQuickAddRefs.current.delete(dateStr);
              }}
              onEdit={handleEditTask}
              onCopy={handleCopyTask}
              onMove={handleMoveTask}
              onRepeat={handleRepeatTask}
              onPrepareSplit={handlePrepareSplit}
              onSplit={handleSplitTask}
              onDelete={(id) => void handleDelete(id)}
            />
          )}

          <div className="mt-4 border-t border-[var(--border)] pt-4 text-center">
            <p className="text-[10px] text-[var(--text-muted)]/70">
              N hızlı ekle · {modKeyLabel()}+Enter panelde kaydet ve yeni · sürükle
              yalnızca aynı ders satırında
            </p>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
