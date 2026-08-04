"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  getCachedProgramSubjects,
  loadProgramSubjects,
} from "@/lib/program/fetch-program-subjects";
import { isTypingTarget, modKeyLabel } from "@/lib/program/form-keyboard";
import AddTaskModal, { type ExistingTask } from "./AddTaskModal";
import BatchComposer from "./batch/BatchComposer";
import DayQuickAdd, {
  type DayQuickAddHandle,
} from "./quick-add/DayQuickAdd";
import QuickAddBransDenemesiModal from "./QuickAddBransDenemesiModal";
import QuickAddKitapOkumaModal from "./QuickAddKitapOkumaModal";
import WeeklyProgramSummaryModal, {
  DENSITY_BADGE_CLS,
  DENSITY_LABEL,
  densityTone,
  getTaskDurationMinutes,
} from "./WeeklyProgramSummaryModal";
import SaveAsTemplateModal from "./SaveAsTemplateModal";
import ApplyTemplateModal from "./ApplyTemplateModal";
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
  GripVertical,
  MoreVertical,
  Copy,
  CalendarClock,
  Repeat,
  Pencil,
  SplitSquareHorizontal,
  BookMarked,
  BookOpen,
  AlertTriangle,
  ClipboardList,
  BookmarkPlus,
  LayoutTemplate,
  Layers,
  Send,
  X,
} from "lucide-react";
import HelpGuideButton from "@/components/ui/HelpGuideButton";

export type { ProgramSubject } from "./program-types";

const WEEKLY_PLAN_GUIDE = {
  title: "Haftalık Program",
  sections: [
    {
      heading: "Taslak Modu ve Yayınla",
      content: [
        "Taslak Modu açıkken eklediğiniz yeni görevler öğrenciye görünmez; kartlarda Taslak rozeti çıkar.",
        "Hazır olduğunuzda Yayınla (veya Yayınla (N)) ile o haftadaki tüm taslakları yayınlarsınız. Taslak yoksa buton pasiftir (Yayınlanacak taslak yok).",
      ],
    },
    {
      heading: "Haftayı Kopyala ve Programı Temizle",
      content: [
        "Haftayı Kopyala: görünen haftanın görevlerini sonraki haftaya ekler. Sonraki haftada zaten görev varsa onay ister (Evet, Kopyala).",
        "Programı Temizle: bu haftadaki tüm görevleri siler. Onay penceresinde Evet, Temizle ile onaylarsınız. Haftada görev yoksa buton pasiftir.",
      ],
    },
    {
      heading: "Şablonlar",
      content: [
        "Şablon Olarak Kaydet: bu haftanın görevlerini şablon olarak saklar (görev yoksa pasif).",
        "Şablondan Oluştur: kayıtlı bir şablonu seçip mevcut haftaya uygular / ekler.",
      ],
    },
    {
      heading: "Yoğunluk rozeti",
      content: [
        "Günlük Hedef tanımlıysa her gün sütununda dk / hedef yanında bir rozet görünür:",
        "rahat — hedefin %70’inin altında",
        "dengeli — hedefin %70–100’ü arası",
        "yoğun — hedefin %100–130’ü arası",
        "aşırı — hedefin %130’unun üstü",
        "Günlük Hedef tanımsızsa rozet çıkmaz. Hedefi başlıktaki Günlük Hedef satırından düzenleyebilirsiniz.",
      ],
    },
    {
      heading: "Görev Ekle paneli",
      content: [
        "Görev Ekle sağda sabit bir panel açar; hafta gridi görünür ve tıklanabilir kalır.",
        "Tek ekranda sırayla: görev türü → ders/konu araması → kaynak (opsiyonel) → detaylar → günler.",
        "Kaydet ve yeni: görevi ekler, paneli kapatmaz; tür ve ders korunur, konu/detay sıfırlanır — hızlı ardışık giriş için.",
        "Kaydet paneli kapatır. Escape ile de kapanır.",
      ],
    },
    {
      heading: "Toplu Ekle",
      content: [
        "Toplu Ekle, hafta gridinin yerine toplu besteleme modunu açar.",
        "Solda zayıf / başlanmayan / tüm konular; sağda tür, süre, kaynak ve gün dağıtımı.",
        "Önizle ile satır satır kontrol edebilir, yük uyarısına rağmen ekleyebilirsiniz.",
      ],
    },
    {
      heading: "Hızlı ekle",
      content: [
        "Gün kartının altındaki Hızlı ekle satırına konu yazın; eşleşenlerden seçince Ders görevi anında oluşur.",
        "Sonda sayı varsa süre olur: örn. türev 40 → 40 dk. Karttaki Düzenle ile paneli açabilirsiniz.",
        "Klavye: gridde N ile odaklı/bugünün gününde hızlı eklemeyi açar. Panelde Enter sonraki alan, Ctrl/⌘+Enter kaydet ve yeni, Ctrl/⌘+Shift+Enter kaydet, Esc kapat.",
      ],
    },
    {
      heading: "İpuçları",
      content: [
        "Bu Hafta ile bugünün haftasına döner; oklarla hafta gezersiniz.",
        "Özet, Program Özeti penceresini açar.",
        "Görevleri tutamaktan sürükleyerek günler arasında taşıyabilirsiniz. Güne Görev Ekle, Branş Denemesi veya Kitap Okuma ile hızlı ekleme yapabilirsiniz.",
      ],
    },
  ],
};

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
  is_published: boolean;
  subject: { name: string } | null;
  topic: { name: string } | null;
  details: Record<string, string | number> | null;
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
}

const TASK_TYPE_BADGE: Record<TaskType, { label: string; color: string }> = {
  ders: { label: "Ders", color: "#4F7CFF" },
  deneme: { label: "Deneme", color: "#A78BFF" },
  bras_deneme: { label: "Branş Denemesi", color: "#00D4FF" },
  soru_cozumu: { label: "Soru Çözümü", color: "#4F7CFF" },
  video_izleme: { label: "Video İzleme", color: "#FF6B9D" },
  tekrar: { label: "Tekrar", color: "#FFB84F" },
  yanlis_analizi: { label: "Yanlış Analizi", color: "#FF5757" },
  odev: { label: "Ödev", color: "#7BE0AD" },
  manuel: { label: "Manuel", color: "#94A3B8" },
  kitap_okuma: { label: "Kitap Okuma", color: "#C17F45" },
};

const FALLBACK_BADGE = { label: "Görev", color: "#94A3B8" };

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

function getBadge(taskType: TaskType) {
  return TASK_TYPE_BADGE[taskType] ?? FALLBACK_BADGE;
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

// ─── Kart menüsü ─────────────────────────────────────────────────────────────

type MenuView = "main" | "move" | "repeat" | "split";

function DayPickerList({
  weekDays,
  currentDate,
  acting,
  onPick,
  onBack,
  allowCurrent = false,
}: {
  weekDays: WeekDayOption[];
  currentDate: string;
  acting: boolean;
  onPick: (dateStr: string) => void;
  onBack: () => void;
  allowCurrent?: boolean;
}) {
  return (
    <div className="max-h-56 overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="w-full border-b border-[var(--border)] px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      >
        ← Menü
      </button>
      {weekDays.map((d) => {
        const isCurrent = d.dateStr === currentDate;
        const disabled = acting || (!allowCurrent && isCurrent);
        return (
          <button
            key={d.dateStr}
            type="button"
            disabled={disabled}
            onClick={() => onPick(d.dateStr)}
            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {d.label}
              {isCurrent ? " · şu an" : ""}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{d.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

function TaskCardMenu({
  taskId,
  currentDate,
  weekDays,
  busy,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
}: {
  taskId: string;
  currentDate: string;
  weekDays: WeekDayOption[];
  busy: boolean;
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [weeks, setWeeks] = useState(4);
  const [acting, setActing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setView("main");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setView("main");
    setWeeks(4);
  };

  const run = async (fn: () => Promise<void>) => {
    setActing(true);
    try {
      await fn();
      close();
    } finally {
      setActing(false);
    }
  };

  const menuItemCls =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setView("main");
        }}
        disabled={busy || acting}
        className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-1 text-[var(--text-muted)] opacity-0 transition-all hover:text-[var(--text-primary)] group-hover:opacity-100 disabled:opacity-50 data-[open=true]:opacity-100"
        data-open={open}
        aria-label="Görev menüsü"
        aria-expanded={open}
      >
        {acting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <MoreVertical className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] py-1 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {view === "main" && (
            <>
              <button
                type="button"
                disabled={acting}
                onClick={() => run(() => onEdit(taskId))}
                className={menuItemCls}
              >
                <Pencil className="h-3.5 w-3.5 text-[var(--accent)]" />
                Düzenle
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => run(() => onCopy(taskId))}
                className={menuItemCls}
              >
                <Copy className="h-3.5 w-3.5 text-[var(--accent)]" />
                Kopyala
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => setView("move")}
                className={menuItemCls}
              >
                <CalendarClock className="h-3.5 w-3.5 text-[var(--accent)]" />
                Başka Güne Taşı
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => setView("repeat")}
                className={menuItemCls}
              >
                <Repeat className="h-3.5 w-3.5 text-[var(--accent)]" />
                Tekrarla
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={async () => {
                  setActing(true);
                  try {
                    const ok = await onPrepareSplit(taskId);
                    if (ok) setView("split");
                  } finally {
                    setActing(false);
                  }
                }}
                className={menuItemCls}
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
                Böl
              </button>
            </>
          )}

          {view === "move" && (
            <DayPickerList
              weekDays={weekDays}
              currentDate={currentDate}
              acting={acting}
              onBack={() => setView("main")}
              onPick={(dateStr) => run(() => onMove(taskId, dateStr))}
            />
          )}

          {view === "split" && (
            <DayPickerList
              weekDays={weekDays}
              currentDate={currentDate}
              acting={acting}
              onBack={() => setView("main")}
              onPick={(dateStr) => run(() => onSplit(taskId, dateStr))}
            />
          )}

          {view === "repeat" && (
            <div className="space-y-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setView("main")}
                className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                ← Menü
              </button>
              <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Kaç hafta boyunca tekrarlansın?
              </p>
              <input
                type="number"
                min={1}
                max={12}
                value={weeks}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setWeeks(Math.min(12, Math.max(1, n)));
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
              />
              <button
                type="button"
                disabled={acting}
                onClick={() => run(() => onRepeat(taskId, weeks))}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
              >
                {acting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Repeat className="h-3.5 w-3.5" />
                )}
                {weeks} hafta tekrarla
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Board kartı ─────────────────────────────────────────────────────────────

function TaskCard({
  task,
  animate,
  onDelete,
  deletingId,
  weekDays,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  menuBusy,
  dragHandleProps,
  setNodeRef,
  style,
  isDragging,
  isOverlay = false,
}: {
  task: PlanTask;
  animate?: boolean;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  weekDays?: WeekDayOption[];
  onEdit?: (taskId: string) => Promise<void>;
  onCopy?: (taskId: string) => Promise<void>;
  onMove?: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat?: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit?: (taskId: string) => Promise<boolean>;
  onSplit?: (taskId: string, dateStr: string) => Promise<void>;
  menuBusy?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging?: boolean;
  isOverlay?: boolean;
}) {
  const badge = getBadge(task.task_type);
  const hasTime = Boolean(task.start_time && task.end_time);
  const duration = getTaskDurationMinutes(task);
  const showDuration = duration > 0;
  const isDraft = task.is_published === false;

  const metaParts: string[] = [];
  if (task.subject?.name) metaParts.push(task.subject.name);
  if (task.topic?.name) metaParts.push(task.topic.name);

  const showActions = Boolean(
    onDelete &&
      onEdit &&
      onCopy &&
      onMove &&
      onRepeat &&
      onPrepareSplit &&
      onSplit &&
      weekDays
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-[var(--surface)]/80 p-3 transition-all duration-200 hover:border-[var(--border)] ${
        isDraft
          ? "border-dashed border-amber-500/40 opacity-70"
          : "border-[var(--border)]"
      } ${task.is_completed ? "opacity-60" : ""} ${
        animate ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300" : ""
      } ${isDragging ? "opacity-40" : ""} ${
        isOverlay
          ? "scale-[1.02] overflow-hidden opacity-95 shadow-2xl shadow-[var(--primary)]/25 ring-1 ring-[var(--primary)]/30"
          : ""
      }`}
    >
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
        style={{ background: badge.color }}
      />

      {isDraft && (
        <span className="absolute left-3 top-1.5 z-10 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-200">
          Taslak
        </span>
      )}

      {dragHandleProps && (
        <button
          type="button"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-grab touch-none rounded-md p-0.5 text-[var(--text-muted)] opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing group-hover:opacity-100"
          aria-label="Sürükle"
          {...dragHandleProps}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {showActions && (
        <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
          <TaskCardMenu
            taskId={task.id}
            currentDate={task.plan_date}
            weekDays={weekDays!}
            busy={Boolean(menuBusy) || deletingId === task.id}
            onEdit={onEdit!}
            onCopy={onCopy!}
            onMove={onMove!}
            onRepeat={onRepeat!}
            onPrepareSplit={onPrepareSplit!}
            onSplit={onSplit!}
          />
          <button
            type="button"
            onClick={() => onDelete!(task.id)}
            disabled={deletingId === task.id || menuBusy}
            className="rounded-md border border-red-500/20 bg-red-500/10 p-1 text-red-400 opacity-0 transition-all hover:bg-red-500/20 group-hover:opacity-100 disabled:opacity-50"
            aria-label="Görevi sil"
          >
            {deletingId === task.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </button>
        </div>
      )}

      <div
        className={`${showActions ? "pr-14" : "pr-6"} ${dragHandleProps ? "pl-5" : "pl-1"} ${
          isDraft ? "pt-4" : ""
        }`}
      >
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

        {hasTime && task.start_time && task.end_time ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 text-[var(--accent)]" />
              {formatTimeTR(task.start_time)} – {formatTimeTR(task.end_time)}
              {showDuration && (
                <span className="text-[var(--text-muted)]">· {duration} dk</span>
              )}
            </span>
            {task.break_minutes != null && task.break_minutes > 0 && (
              <span className="rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--accent)]">
                {task.break_minutes} dk mola
              </span>
            )}
          </div>
        ) : showDuration ? (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Clock className="h-3 w-3 shrink-0 text-[var(--accent)]" />
            {duration} dk
          </div>
        ) : null}

        {onEdit && !isOverlay ? (
          <button
            type="button"
            onClick={() => void onEdit(task.id)}
            disabled={menuBusy}
            className="mt-2 text-[10px] font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 disabled:opacity-50"
          >
            Düzenle
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  animate,
  onDelete,
  deletingId,
  weekDays,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  menuBusy,
}: {
  task: PlanTask;
  animate: boolean;
  onDelete: (id: string) => void;
  deletingId: string | null;
  weekDays: WeekDayOption[];
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
  menuBusy: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(task.id) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskCard
      task={task}
      animate={animate}
      onDelete={onDelete}
      deletingId={deletingId}
      weekDays={weekDays}
      onEdit={onEdit}
      onCopy={onCopy}
      onMove={onMove}
      onRepeat={onRepeat}
      onPrepareSplit={onPrepareSplit}
      onSplit={onSplit}
      menuBusy={menuBusy}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

function DayColumn({
  dateStr,
  day,
  colIndex,
  dayTasks,
  todayCol,
  onDelete,
  deletingId,
  shouldAnimate,
  onAdd,
  onAddBrans,
  onAddKitap,
  weekDays,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  menuBusy,
  dailyTargetMinutes,
  studentId,
  subjects,
  taskCountForDate,
  draftMode,
  onQuickAddSuccess,
  onQuickAddError,
  quickAddRef,
}: {
  dateStr: string;
  day: Date;
  colIndex: number;
  dayTasks: PlanTask[];
  todayCol: boolean;
  onDelete: (id: string) => void;
  deletingId: string | null;
  shouldAnimate: (id: string) => boolean;
  onAdd: () => void;
  onAddBrans: () => void;
  onAddKitap: () => void;
  weekDays: WeekDayOption[];
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
  menuBusy: boolean;
  dailyTargetMinutes: number | null;
  studentId: string;
  subjects: ProgramSubject[];
  taskCountForDate: (date: string) => number;
  draftMode: boolean;
  onQuickAddSuccess: (planDate: string) => void;
  onQuickAddError: (message: string) => void;
  quickAddRef?: (handle: DayQuickAddHandle | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });

  const totalMinutes = dayTasks.reduce(
    (sum, t) => sum + getTaskDurationMinutes(t),
    0
  );
  const tone =
    dailyTargetMinutes != null && dailyTargetMinutes > 0
      ? densityTone(totalMinutes, dailyTargetMinutes)
      : null;

  const quickBtnCls =
    "flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] py-1.5 text-[10px] font-semibold text-[var(--text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.06] hover:text-[var(--accent)]";

  return (
    <div
      ref={setNodeRef}
      data-plan-date={dateStr}
      tabIndex={0}
      className={`flex min-h-[8rem] min-w-[240px] flex-col rounded-xl border p-2.5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 lg:min-w-0 ${
        isOver
          ? "border-[var(--primary)]/50 bg-[var(--primary)]/[0.08] shadow-[0_0_24px_rgba(123,47,255,0.15)]"
          : todayCol
            ? "border-[var(--primary)]/30 bg-[var(--primary)]/[0.04] shadow-[0_0_20px_rgba(123,47,255,0.08)]"
            : "border-[var(--border)] bg-white/[0.02]"
      }`}
    >
      <div className="mb-2 border-b border-[var(--border)] pb-2">
        <p
          className={`text-xs font-bold ${
            todayCol || isOver ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
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
        {(totalMinutes > 0 || tone) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {totalMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                <Clock className="h-3 w-3 text-[var(--accent)]" />
                {totalMinutes} dk
                {dailyTargetMinutes != null && dailyTargetMinutes > 0 && (
                  <span className="font-normal text-[var(--text-muted)]">
                    / {dailyTargetMinutes}
                  </span>
                )}
              </span>
            )}
            {tone && (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${DENSITY_BADGE_CLS[tone]}`}
              >
                {DENSITY_LABEL[tone]}
              </span>
            )}
          </div>
        )}
      </div>

      <SortableContext
        items={dayTasks.map((t) => String(t.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {dayTasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-2 py-6">
              <p className="text-center text-[10px] text-[var(--text-muted)]">
                {isOver ? "Buraya bırak" : "görev yok"}
              </p>
            </div>
          ) : (
            dayTasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                animate={shouldAnimate(task.id)}
                onDelete={onDelete}
                deletingId={deletingId}
                weekDays={weekDays}
                onEdit={onEdit}
                onCopy={onCopy}
                onMove={onMove}
                onRepeat={onRepeat}
                onPrepareSplit={onPrepareSplit}
                onSplit={onSplit}
                menuBusy={menuBusy}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="mt-2 flex flex-col gap-1.5">
        <button type="button" onClick={onAdd} className={quickBtnCls}>
          <Plus className="h-3.5 w-3.5" />
          Görev Ekle
        </button>
        <button type="button" onClick={onAddBrans} className={quickBtnCls}>
          <BookMarked className="h-3 w-3" />
          Branş Denemesi
        </button>
        <button type="button" onClick={onAddKitap} className={quickBtnCls}>
          <BookOpen className="h-3 w-3" />
          Kitap Okuma
        </button>
        <DayQuickAdd
          ref={(handle) => quickAddRef?.(handle)}
          studentId={studentId}
          subjects={subjects}
          planDate={dateStr}
          taskCountForDate={taskCountForDate}
          draftMode={draftMode}
          onSuccess={onQuickAddSuccess}
          onError={onQuickAddError}
        />
      </div>
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
  } | null>(null);
  const [bransModal, setBransModal] = useState<{
    planDate: string;
    dayLabel: string;
  } | null>(null);
  const [kitapModal, setKitapModal] = useState<{
    planDate: string;
    dayLabel: string;
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
  const [activeTask, setActiveTask] = useState<PlanTask | null>(null);
  const [menuBusy, setMenuBusy] = useState(false);
  const seenTaskIds = useRef(new Set<string>());
  const dayQuickAddRefs = useRef(new Map<string, DayQuickAddHandle>());
  const pendingSplitRef = useRef<{
    taskId: string;
    row: RawStudyPlanTask;
    field: SplitField;
    keep: number;
    move: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
        "id, plan_date, task_type, title, start_time, end_time, break_minutes, order_index, is_completed, is_published, details, subject:subjects(name), topic:topics(name)"
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
    if (batchMode || addModal || bransModal || kitapModal || weekConfirm) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

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
    bransModal,
    kitapModal,
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
    seenTaskIds.current.delete(taskId);
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

  const updateTaskPosition = useCallback(
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

  const findContainerDate = useCallback(
    (id: string): string | null => {
      if (weekDateStrs.includes(id)) return id;
      return tasks.find((t) => t.id === id)?.plan_date ?? null;
    },
    [weekDateStrs, tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveTask(tasks.find((t) => t.id === id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeItem = tasks.find((t) => t.id === activeId);
    if (!activeItem) return;

    const fromDate = activeItem.plan_date;
    const toDate = findContainerDate(overId);
    if (!toDate) return;

    const prevTasks = tasks;

    if (fromDate === toDate) {
      const dayTasks = [...(tasksByDate.get(fromDate) ?? [])];
      const oldIndex = dayTasks.findIndex((t) => t.id === activeId);
      if (oldIndex < 0) return;

      let newIndex: number;
      if (weekDateStrs.includes(overId)) {
        newIndex = dayTasks.length - 1;
      } else {
        newIndex = dayTasks.findIndex((t) => t.id === overId);
      }
      if (newIndex < 0 || oldIndex === newIndex) return;

      const reordered = arrayMove(dayTasks, oldIndex, newIndex).map(
        (t, i) => ({ ...t, order_index: i })
      );

      setTasks((prev) => {
        const others = prev.filter((t) => t.plan_date !== fromDate);
        return [...others, ...reordered];
      });

      const error = await updateTaskPosition(
        reordered.map((t) => ({ id: t.id, order_index: t.order_index }))
      );
      if (error) {
        setTasks(prevTasks);
        setToast({
          type: "error",
          message: "Sıralama kaydedilemedi: " + error.message,
        });
      }
      return;
    }

    // Başka güne taşı
    const sourceTasks = (tasksByDate.get(fromDate) ?? []).filter(
      (t) => t.id !== activeId
    );
    const targetTasks = [...(tasksByDate.get(toDate) ?? [])];

    let insertIndex: number;
    if (weekDateStrs.includes(overId)) {
      insertIndex = targetTasks.length;
    } else {
      const overIndex = targetTasks.findIndex((t) => t.id === overId);
      insertIndex = overIndex >= 0 ? overIndex : targetTasks.length;
    }

    const moved: PlanTask = {
      ...activeItem,
      plan_date: toDate,
      order_index: insertIndex,
    };
    targetTasks.splice(insertIndex, 0, moved);

    const reindexedSource = sourceTasks.map((t, i) => ({
      ...t,
      order_index: i,
    }));
    const reindexedTarget = targetTasks.map((t, i) => ({
      ...t,
      order_index: i,
    }));

    setTasks((prev) => {
      const others = prev.filter(
        (t) => t.plan_date !== fromDate && t.plan_date !== toDate
      );
      return [...others, ...reindexedSource, ...reindexedTarget];
    });

    const error = await updateTaskPosition([
      ...reindexedSource.map((t) => ({
        id: t.id,
        plan_date: fromDate,
        order_index: t.order_index,
      })),
      ...reindexedTarget.map((t) => ({
        id: t.id,
        plan_date: toDate,
        order_index: t.order_index,
      })),
    ]);

    if (error) {
      setTasks(prevTasks);
      setToast({
        type: "error",
        message: "Taşıma kaydedilemedi: " + error.message,
      });
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const shouldAnimate = (id: string) => {
    if (seenTaskIds.current.has(id)) return false;
    seenTaskIds.current.add(id);
    return true;
  };

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

  const openAddModal = (day: Date, colIndex: number) => {
    setAddModal({
      planDate: toISODate(day),
      dayLabel: `${DAY_LABELS_FULL[colIndex]}, ${formatColumnDate(day)}`,
      existingTask: null,
    });
  };

  const openBransModal = (day: Date, colIndex: number) => {
    setBransModal({
      planDate: toISODate(day),
      dayLabel: `${DAY_LABELS_FULL[colIndex]}, ${formatColumnDate(day)}`,
    });
  };

  const openKitapModal = (day: Date, colIndex: number) => {
    setKitapModal({
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
          existingTask={addModal.existingTask}
          weekDays={addModal.existingTask ? undefined : weekDays}
          draftMode={draftMode}
        />
      )}

      {bransModal && (
        <QuickAddBransDenemesiModal
          onClose={() => setBransModal(null)}
          studentId={studentId}
          subjects={subjects}
          planDate={bransModal.planDate}
          dayLabel={bransModal.dayLabel}
          taskCountForDate={taskCountForDate}
          onSuccess={handleTaskAdded}
          onError={handleTaskError}
          weekDays={weekDays}
          draftMode={draftMode}
        />
      )}

      {kitapModal && (
        <QuickAddKitapOkumaModal
          onClose={() => setKitapModal(null)}
          studentId={studentId}
          planDate={kitapModal.planDate}
          dayLabel={kitapModal.dayLabel}
          taskCountForDate={taskCountForDate}
          onSuccess={handleTaskAdded}
          onError={handleTaskError}
          weekDays={weekDays}
          draftMode={draftMode}
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Haftalık Program
                  </h3>
                  <HelpGuideButton
                    title={WEEKLY_PLAN_GUIDE.title}
                    sections={WEEKLY_PLAN_GUIDE.sections}
                  />
                </div>
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

        <div className="p-4">
          {subjectsLoading || tasksLoading ? (
            <div className="overflow-x-auto animate-pulse">
              <div className="grid w-max min-w-full grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 min-w-[240px] rounded-xl bg-[var(--surface-2)]"
                  />
                ))}
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div
                className={`overflow-x-auto lg:overflow-visible ${
                  addModal ? "lg:mr-[400px]" : ""
                }`}
              >
                <div className="grid w-max min-w-full grid-cols-7 gap-3 lg:w-auto lg:grid-cols-4 xl:grid-cols-7">
                  {weekDays.map((day, colIndex) => {
                    const dateStr = toISODate(day);
                    const dayTasks = tasksByDate.get(dateStr) ?? [];
                    return (
                      <DayColumn
                        key={dateStr}
                        dateStr={dateStr}
                        day={day}
                        colIndex={colIndex}
                        dayTasks={dayTasks}
                        todayCol={isToday(day)}
                        onDelete={handleDelete}
                        deletingId={deletingId}
                        shouldAnimate={shouldAnimate}
                        onAdd={() => openAddModal(day, colIndex)}
                        onAddBrans={() => openBransModal(day, colIndex)}
                        onAddKitap={() => openKitapModal(day, colIndex)}
                        weekDays={weekDayOptions}
                        onEdit={handleEditTask}
                        onCopy={handleCopyTask}
                        onMove={handleMoveTask}
                        onRepeat={handleRepeatTask}
                        onPrepareSplit={handlePrepareSplit}
                        onSplit={handleSplitTask}
                        menuBusy={menuBusy}
                        dailyTargetMinutes={dailyTargetMinutes}
                        studentId={studentId}
                        subjects={subjects}
                        taskCountForDate={taskCountForDate}
                        draftMode={draftMode}
                        onQuickAddSuccess={handleQuickAddSuccess}
                        onQuickAddError={handleTaskError}
                        quickAddRef={(handle) => {
                          if (handle) dayQuickAddRefs.current.set(dateStr, handle);
                          else dayQuickAddRefs.current.delete(dateStr);
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <DragOverlay dropAnimation={null}>
                {activeTask ? (
                  <div className="w-[11rem]">
                    <TaskCard task={activeTask} isOverlay />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          <div className="mt-4 flex flex-col items-center gap-2 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-[var(--text-muted)]">
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
            <p className="text-[10px] text-[var(--text-muted)]/70">
              N hızlı ekle · {modKeyLabel()}+Enter panelde kaydet ve yeni
            </p>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
