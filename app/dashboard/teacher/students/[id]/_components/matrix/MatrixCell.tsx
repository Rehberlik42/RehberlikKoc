"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  Loader2,
  MoreVertical,
  Plus,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  getTaskTypeColorVar,
  getTaskTypeIcon,
} from "@/lib/program/task-type-icons";
import {
  cellDroppableId,
  getActivityDisplayLabel,
  type MatrixTask,
  type TaskBlock,
} from "./matrix-grouping";

type WeekDayOption = {
  dateStr: string;
  label: string;
  sub: string;
};

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
            className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
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

function menuPosition(
  anchor: DOMRect,
  menuH: number
): { top: number; left: number } {
  const menuW = 192;
  const pad = 8;
  let left = anchor.right - menuW;
  let top = anchor.bottom + 4;
  if (left < pad) left = pad;
  if (left + menuW > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - menuW - pad);
  }
  if (top + menuH > window.innerHeight - pad) {
    top = anchor.top - menuH - 4;
  }
  if (top < pad) top = pad;
  return { top, left };
}

function ActivityMenu({
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
  onDelete,
  open,
  onOpenChange,
  anchorRef,
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
  onDelete: (taskId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const [view, setView] = useState<MenuView>("main");
  const [weeks, setWeeks] = useState(4);
  const [acting, setActing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuH = rootRef.current?.offsetHeight || 220;
      setPos(menuPosition(rect, menuH));
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef, view]);

  useEffect(() => {
    if (!open) {
      setView("main");
      setWeeks(4);
      return;
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange, anchorRef]);

  const close = () => {
    onOpenChange(false);
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
    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]";

  if (!open || !mounted) return null;

  const anchor = anchorRef.current?.getBoundingClientRect();
  const stylePos =
    pos ??
    (anchor ? menuPosition(anchor, 220) : { top: -9999, left: -9999 });

  return createPortal(
    <div
      ref={rootRef}
      className="fixed z-[80] w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] py-1 shadow-lg"
      style={{ top: stylePos.top, left: stylePos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {view === "main" && (
        <>
          <button
            type="button"
            disabled={acting || busy}
            onClick={() => run(() => onEdit(taskId))}
            className={menuItemCls}
          >
            Düzenle
          </button>
          <button
            type="button"
            disabled={acting || busy}
            onClick={() => run(() => onCopy(taskId))}
            className={menuItemCls}
          >
            Kopyala
          </button>
          <button
            type="button"
            disabled={acting || busy}
            onClick={() => setView("move")}
            className={menuItemCls}
          >
            Başka Güne Taşı
          </button>
          <button
            type="button"
            disabled={acting || busy}
            onClick={() => setView("repeat")}
            className={menuItemCls}
          >
            Tekrarla
          </button>
          <button
            type="button"
            disabled={acting || busy}
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
            Böl
          </button>
          <button
            type="button"
            disabled={acting || busy}
            onClick={() => {
              onDelete(taskId);
              close();
            }}
            className={`${menuItemCls} text-[var(--danger)]`}
          >
            Sil
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
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"
          >
            {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {weeks} hafta tekrarla
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

type RowActions = {
  weekDays: WeekDayOption[];
  menuBusy: boolean;
  deletingId: string | null;
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
  onDelete: (taskId: string) => void;
};

function ActivityRow({
  task,
  weekDays,
  menuBusy,
  deletingId,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  onDelete,
}: { task: MatrixTask } & RowActions) {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const Icon = getTaskTypeIcon(task.task_type);
  const iconColor = getTaskTypeColorVar(task.task_type);
  const label = getActivityDisplayLabel(task);
  const isDraft = task.is_published === false;
  const busy = menuBusy || deletingId === task.id;

  return (
    <div className="group/row relative">
      <button
        ref={anchorRef}
        type="button"
        disabled={busy}
        onClick={() => setMenuOpen((v) => !v)}
        className={`flex w-full min-w-0 items-center justify-start gap-1.5 rounded px-0.5 py-px text-left hover:bg-[var(--surface-2)] disabled:opacity-50 ${
          task.is_completed ? "opacity-60" : ""
        }`}
      >
        <Icon
          className="h-3.5 w-3.5 shrink-0 opacity-80"
          style={{ color: iconColor }}
        />
        <span
          className={`min-w-0 flex-1 text-left text-[11px] leading-tight text-[var(--text-secondary)] ${
            task.is_completed
              ? "line-through decoration-[var(--text-muted)]"
              : ""
          }`}
        >
          {label}
        </span>
        {task.is_completed ? (
          <Check
            className="h-3 w-3 shrink-0 text-[var(--success)]"
            aria-label="Tamamlandı"
          />
        ) : null}
        {isDraft ? (
          <span className="shrink-0 rounded border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-[var(--warning)]">
            Taslak
          </span>
        ) : null}
        <MoreVertical className="h-3 w-3 shrink-0 text-[var(--text-muted)] opacity-0 group-hover/row:opacity-100" />
      </button>

      <ActivityMenu
        taskId={task.id}
        currentDate={task.plan_date}
        weekDays={weekDays}
        busy={busy}
        onEdit={onEdit}
        onCopy={onCopy}
        onMove={onMove}
        onRepeat={onRepeat}
        onPrepareSplit={onPrepareSplit}
        onSplit={onSplit}
        onDelete={onDelete}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        anchorRef={anchorRef}
      />
    </div>
  );
}

function SortableTaskBlock({
  block,
  weekDays,
  menuBusy,
  deletingId,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  onDelete,
}: { block: TaskBlock } & RowActions) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.blockId });

  const HeaderIcon = getTaskTypeIcon(block.headerTaskType);
  const headerColor = getTaskTypeColorVar(block.headerTaskType);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/block text-left ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-0.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--text-muted)] opacity-0 hover:text-[var(--text-primary)] group-hover/block:opacity-100 active:cursor-grabbing"
          aria-label="Bloğu sürükle"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>

        <div className="min-w-0 flex-1">
          {/* Başlık — tıklanınca menü açılmaz */}
          <div className="flex items-center gap-1.5">
            <HeaderIcon
              className="h-3.5 w-3.5 shrink-0 opacity-80"
              style={{ color: headerColor }}
            />
            <p className="min-w-0 flex-1 text-left text-[12px] font-medium leading-tight text-[var(--text-primary)]">
              {block.subjectLabel}
            </p>
          </div>

          {block.topicLabel ? (
            <p className="mt-px text-left text-[12px] leading-tight text-[var(--text-secondary)]">
              {block.topicLabel}
            </p>
          ) : null}

          <div className="my-1 border-t border-[var(--border)]" />

          <div className="space-y-px">
            {block.tasks.map((task) => (
              <ActivityRow
                key={task.id}
                task={task}
                weekDays={weekDays}
                menuBusy={menuBusy}
                deletingId={deletingId}
                onEdit={onEdit}
                onCopy={onCopy}
                onMove={onMove}
                onRepeat={onRepeat}
                onPrepareSplit={onPrepareSplit}
                onSplit={onSplit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MatrixCell({
  dateStr,
  slotIndex,
  block,
  weekDays,
  menuBusy,
  deletingId,
  onAdd,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  onDelete,
}: {
  dateStr: string;
  slotIndex: number;
  block: TaskBlock | null;
  weekDays: WeekDayOption[];
  menuBusy: boolean;
  deletingId: string | null;
  onAdd: () => void;
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
  onDelete: (taskId: string) => void;
}) {
  const droppableId = cellDroppableId(dateStr, slotIndex);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const actions: RowActions = {
    weekDays,
    menuBusy,
    deletingId,
    onEdit,
    onCopy,
    onMove,
    onRepeat,
    onPrepareSplit,
    onSplit,
    onDelete,
  };

  return (
    <div
      ref={setNodeRef}
      className={`group/cell relative min-h-[2.5rem] border-b border-r border-[var(--border)] px-1 py-1 ${
        isOver ? "bg-[var(--primary)]/10" : ""
      }`}
    >
      {block ? (
        <SortableTaskBlock block={block} {...actions} />
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-full min-h-[2rem] w-full items-center justify-center rounded text-[var(--text-muted)] opacity-0 hover:bg-[var(--surface-2)] hover:text-[var(--accent)] group-hover/cell:opacity-100"
          aria-label="Görev ekle"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
