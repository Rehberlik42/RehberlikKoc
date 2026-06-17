"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "./SearchableSelect";
import {
  BookOpen,
  Tag,
  Clock,
  Calendar,
  Save,
  Loader2,
  CheckCheck,
  AlertCircle,
  Trash2,
  ListTodo,
  FileText,
  Timer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgramSubject {
  id: number;
  name: string;
  exam?: string;
  topics: { id: number; name: string }[];
}

type TaskType = "ders" | "deneme" | "bras_deneme";
type ScheduleMode = "task" | "time";
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

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "ders", label: "Ders" },
  { value: "deneme", label: "Deneme" },
  { value: "bras_deneme", label: "Branş Denemesi" },
];

const TASK_TYPE_BADGE: Record<TaskType, { label: string; color: string }> = {
  ders: { label: "Ders", color: "#4F7CFF" },
  deneme: { label: "Deneme", color: "#A78BFF" },
  bras_deneme: { label: "Branş Denemesi", color: "#00D4FF" },
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
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

function buildSuggestedTitle(
  taskType: TaskType,
  subject: ProgramSubject | undefined,
  topicName: string | undefined
) {
  if (taskType === "deneme") return "Deneme";
  if (taskType === "bras_deneme") {
    return subject ? `${subject.name} Branş Denemesi` : "Branş Denemesi";
  }
  if (subject && topicName) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name} — ${topicName}`;
  }
  if (subject) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name}`;
  }
  return "Ders";
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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
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

// ─── Input helpers ───────────────────────────────────────────────────────────

function NumInput({
  label,
  icon,
  value,
  onChange,
  min = 0,
  accentColor = "#7B2FFF",
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  accentColor?: string;
}) {
  const hasValue = value !== "";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-center text-sm font-bold text-white placeholder-white/20 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
          hasValue
            ? "border-white/15 bg-white/[0.06]"
            : "border-white/8 bg-white/[0.04]"
        }`}
        style={{
          ["--tw-ring-color" as string]: `${accentColor}55`,
          boxShadow: hasValue ? `0 0 14px ${accentColor}22` : undefined,
        }}
        placeholder="0"
      />
    </div>
  );
}

function SelectField({
  label,
  icon,
  value,
  onChange,
  children,
  disabled = false,
  highlighted = false,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 transition-opacity duration-300 ${
        disabled ? "opacity-50" : "opacity-100"
      }`}
    >
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed ${
            highlighted
              ? "cursor-pointer border-[#7B2FFF]/25 bg-[#7B2FFF]/[0.06] shadow-[0_0_12px_rgba(123,47,255,0.1)]"
              : "cursor-pointer border-white/8 bg-white/[0.04]"
          }`}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
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
      className={`group relative overflow-hidden rounded-xl border border-white/8 bg-[#0d0d2b]/80 p-3 transition-all duration-200 hover:border-white/12 ${
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
          className={`mt-1.5 text-sm font-semibold leading-snug text-white ${
            task.is_completed ? "line-through decoration-white/30" : ""
          }`}
        >
          {task.title}
        </p>

        {metaParts.length > 0 && (
          <p className="mt-1 text-[11px] text-white/40">{metaParts.join(" · ")}</p>
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
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TeacherWeeklyPlan({ studentId, subjects }: Props) {
  const supabase = createClient();

  const [planDate, setPlanDate] = useState(todayISO);
  const [taskType, setTaskType] = useState<TaskType>("ders");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("task");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
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

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];
  const showSubject = taskType !== "deneme";

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

  useEffect(() => {
    setTopicId("");
  }, [subjectId]);

  useEffect(() => {
    if (taskType === "deneme") {
      setSubjectId("");
      setTopicId("");
    }
  }, [taskType]);

  useEffect(() => {
    if (!titleEdited) {
      const topicName = topics.find((t) => String(t.id) === topicId)?.name;
      setTitle(buildSuggestedTitle(taskType, selectedSubject, topicName));
    }
  }, [taskType, subjectId, topicId, selectedSubject, topics, titleEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planDate) {
      setToast({ type: "error", message: "Lütfen bir gün seçin." });
      return;
    }
    if (!title.trim()) {
      setToast({ type: "error", message: "Lütfen bir başlık girin." });
      return;
    }
    if (showSubject && taskType === "ders" && !subjectId) {
      setToast({ type: "error", message: "Lütfen bir ders seçin." });
      return;
    }
    if (scheduleMode === "time" && (!startTime || !endTime)) {
      setToast({ type: "error", message: "Saat usulünde başlangıç ve bitiş saati zorunludur." });
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setToast({ type: "error", message: "Oturum süresi doldu, lütfen tekrar giriş yapın." });
      setLoading(false);
      return;
    }

    // studentId client'tan gelir; RLS (is_teacher_of_student + teacher_id=auth.uid()) yetkiyi doğrular.
    const dayTasks = tasks.filter((t) => t.plan_date === planDate);
    const orderIndex =
      scheduleMode === "task"
        ? dayTasks.length > 0
          ? Math.max(...dayTasks.map((t) => t.order_index)) + 1
          : 0
        : Date.now();

    const { error } = await supabase.from("study_plan_tasks").insert({
      student_id: studentId,
      teacher_id: user.id,
      plan_date: planDate,
      subject_id: subjectId ? parseInt(subjectId) : null,
      topic_id: topicId ? parseInt(topicId) : null,
      task_type: taskType,
      title: title.trim(),
      start_time: scheduleMode === "time" ? startTime : null,
      end_time: scheduleMode === "time" ? endTime : null,
      break_minutes:
        scheduleMode === "time" && breakMinutes !== ""
          ? parseInt(breakMinutes)
          : null,
      order_index: orderIndex,
      is_completed: false,
    });

    setLoading(false);

    if (error) {
      setToast({ type: "error", message: "Kayıt sırasında hata oluştu: " + error.message });
      return;
    }

    setToast({ type: "success", message: "Görev eklendi!" });
    setTitleEdited(false);
    setStartTime("");
    setEndTime("");
    setBreakMinutes("");

    const addedWeekStart = startOfWeek(new Date(planDate + "T12:00:00"));
    if (addedWeekStart.getTime() !== weekStart.getTime()) {
      setWeekStart(addedWeekStart);
    } else {
      await fetchTasks();
    }
  };

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

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="space-y-6">
        {/* Form kartı */}
        <div className="rounded-2xl border border-white/8 bg-[#0d0d2b]/50">
          <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B2FFF]/20 bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20">
              <ListTodo className="h-4 w-4 text-[#A78BFF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Haftalık Görev Ekle</h3>
              <p className="text-[11px] text-white/30">Öğrenciye planlı görev ata</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Gün + Görev tipi */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  <Calendar className="h-3.5 w-3.5" />
                  Gün
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0"
                />
              </div>

              <SelectField
                label="Görev Tipi"
                icon={<Tag className="h-3.5 w-3.5" />}
                value={taskType}
                onChange={(v) => setTaskType(v as TaskType)}
              >
                {TASK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
            </div>

            {/* Ders + Kazanım */}
            {showSubject && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300">
                <SearchableSelect
                  label="Ders"
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  value={subjectId}
                  onChange={setSubjectId}
                  options={[
                    { value: "", label: "— Ders seçin —" },
                    ...subjects.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      hint: s.exam,
                    })),
                  ]}
                  placeholder="— Ders seçin —"
                />

                <SearchableSelect
                  label="Kazanım (opsiyonel)"
                  icon={<Tag className="h-3.5 w-3.5" />}
                  value={topicId}
                  onChange={setTopicId}
                  options={[
                    { value: "", label: "— Kazanım seçin —" },
                    ...topics.map((t) => ({
                      value: String(t.id),
                      label: t.name,
                    })),
                  ]}
                  disabled={!subjectId || topics.length === 0}
                  placeholder="— Kazanım seçin —"
                  emptyText="Bu derse ait kazanım yok"
                />
              </div>
            )}

            {/* Başlık */}
            <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                <FileText className="h-3.5 w-3.5" />
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleEdited(true);
                }}
                required
                placeholder="Görev başlığı"
                className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0"
              />
            </div>

            {/* Mod seçici */}
            <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Planlama Modu
              </p>
              <div className="flex gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
                {(
                  [
                    { id: "task" as const, label: "Görev Usulü", icon: ListTodo },
                    { id: "time" as const, label: "Saat Usulü", icon: Timer },
                  ] as const
                ).map(({ id, label, icon: Icon }) => {
                  const isActive = scheduleMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setScheduleMode(id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-[#7B2FFF]/20 text-white shadow-[0_0_16px_rgba(123,47,255,0.12)]"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saat usulü alanları */}
            {scheduleMode === "time" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    <Clock className="h-3.5 w-3.5 text-[#7AB3FF]" />
                    Başlangıç
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    <Clock className="h-3.5 w-3.5 text-[#7AB3FF]" />
                    Bitiş
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0"
                  />
                </div>
                <NumInput
                  label="Mola (dk)"
                  icon={<Clock className="h-3.5 w-3.5 text-[#7AB3FF]" />}
                  value={breakMinutes}
                  onChange={setBreakMinutes}
                  accentColor="#4F7CFF"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] py-3 text-sm font-bold text-white shadow-lg shadow-[#7B2FFF]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-[#7B2FFF]/50 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Kaydediliyor…" : "Görevi Kaydet"}
            </button>
          </form>
        </div>

        {/* Haftalık board */}
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d2b]/50">
          <div className="border-b border-white/5 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#4F7CFF]/20 bg-gradient-to-br from-[#4F7CFF]/30 to-[#00D4FF]/20">
                  <Calendar className="h-4 w-4 text-[#7AB3FF]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Haftalık Program</h3>
                  <p className="text-[11px] text-white/30">
                    {tasks.length > 0 ? `${tasks.length} görev bu hafta` : "Bu hafta görev yok"}
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
                              onDelete={handleDelete}
                              deletingId={deletingId}
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
      </div>
    </>
  );
}
