"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  Loader2,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getTaskTypeIcon } from "@/lib/program/task-type-icons";
import {
  cellDroppableId,
  getActivityShortLabel,
  groupCellTasks,
  type MatrixRowKey,
  type MatrixTask,
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
}) {
  const [view, setView] = useState<MenuView>("main");
  const [weeks, setWeeks] = useState(4);
  const [acting, setActing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setView("main");
      setWeeks(4);
      return;
    }
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

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

  if (!open) return null;

  return (
    <div ref={rootRef} className="absolute right-0 top-full z-30 mt-0.5">
      <div
        className="w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] py-1 shadow-lg"
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
              {acting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {weeks} hafta tekrarla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableActivityRow({
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
}: {
  task: MatrixTask;
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(task.id) });

  const [menuOpen, setMenuOpen] = useState(false);
  const Icon = getTaskTypeIcon(task.task_type);
  const label = getActivityShortLabel(task);
  const isDraft = task.is_published === false;
  const busy = menuBusy || deletingId === task.id;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/row relative ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-0.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--text-muted)] opacity-0 hover:text-[var(--text-primary)] group-hover/row:opacity-100 active:cursor-grabbing"
          aria-label="Sürükle"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex min-w-0 flex-1 items-start gap-1 rounded px-0.5 py-0.5 text-left hover:bg-[var(--surface-2)] disabled:opacity-50 ${
            task.is_completed ? "opacity-70" : ""
          }`}
        >
          <Icon className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)]" />
          <span
            className={`min-w-0 flex-1 text-[11px] leading-snug text-[var(--text-secondary)] ${
              task.is_completed ? "line-through decoration-[var(--text-muted)]" : ""
            }`}
          >
            {label}
          </span>
          {task.is_completed ? (
            <Check
              className="mt-0.5 h-3 w-3 shrink-0 text-[var(--success)]"
              aria-label="Tamamlandı"
            />
          ) : null}
          {isDraft ? (
            <span className="mt-0.5 shrink-0 rounded border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-[var(--warning)]">
              Taslak
            </span>
          ) : null}
          <MoreVertical className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)] opacity-0 group-hover/row:opacity-100" />
        </button>
      </div>

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
      />
    </div>
  );
}

export default function MatrixCell({
  rowKey,
  dateStr,
  tasks,
  dimmed,
  canAdd,
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
  rowKey: MatrixRowKey;
  dateStr: string;
  tasks: MatrixTask[];
  dimmed: boolean;
  canAdd: boolean;
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
  const droppableId = cellDroppableId(rowKey, dateStr);
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const blocks = groupCellTasks(tasks);
  const sortableIds = tasks.map((t) => String(t.id));

  return (
    <div
      ref={setNodeRef}
      className={`group/cell relative min-h-[2.75rem] border-b border-r border-[var(--border)] px-1.5 py-1.5 ${
        isOver
          ? "bg-[var(--primary)]/10"
          : dimmed
            ? "opacity-35"
            : ""
      }`}
    >
      {canAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="absolute right-1 top-1 z-10 rounded border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[var(--text-muted)] opacity-0 hover:text-[var(--accent)] group-hover/cell:opacity-100"
          aria-label="Görev ekle"
        >
          <Plus className="h-3 w-3" />
        </button>
      ) : null}

      {tasks.length === 0 ? (
        <p className="px-1 py-1 text-[11px] text-[var(--text-muted)]">—</p>
      ) : (
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 pr-4">
            {blocks.map((block) => (
              <div key={block.topicKey}>
                <p className="text-[12px] font-normal leading-snug text-[var(--text-primary)]">
                  {block.topicLabel}
                </p>
                <div className="mt-0.5 space-y-0.5">
                  {block.tasks.map((task) => (
                    <SortableActivityRow
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
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
