"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import {
  getTaskTypeColorVar,
  getTaskTypeIcon,
} from "@/lib/program/task-type-icons";
import type { DailyTargetUnit } from "@/lib/weekly-program-summary";
import type { ProgramSubject } from "../program-types";
import DayQuickAdd, {
  type DayQuickAddHandle,
} from "../quick-add/DayQuickAdd";
import MatrixCell from "./MatrixCell";
import MatrixDayHeader from "./MatrixDayHeader";
import {
  buildBlocksByDate,
  cellDroppableId,
  findBlockById,
  flattenBlocksToTasks,
  getActivityDisplayLabel,
  isBlockDragId,
  parseCellDroppableId,
  type MatrixTask,
  type TaskBlock,
} from "./matrix-grouping";

type WeekDayOption = {
  dateStr: string;
  label: string;
  sub: string;
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isTodayDate(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function DragPreview({ block }: { block: TaskBlock }) {
  const Icon = getTaskTypeIcon(block.headerTaskType);
  const iconColor = getTaskTypeColorVar(block.headerTaskType);
  return (
    <div className="rounded-lg border border-[var(--primary)]/40 bg-[var(--surface)] px-2 py-1.5 shadow-lg">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 opacity-80" style={{ color: iconColor }} />
        <p className="truncate text-left text-[12px] font-medium leading-tight text-[var(--text-primary)]">
          {block.subjectLabel}
        </p>
      </div>
      {block.topicLabel ? (
        <p className="mt-px truncate text-left text-[11px] leading-tight text-[var(--text-secondary)]">
          {block.topicLabel}
        </p>
      ) : null}
      <p className="mt-0.5 text-left text-[10px] text-[var(--text-muted)]">
        {block.tasks.length} etkinlik
        {block.tasks[0]
          ? ` · ${getActivityDisplayLabel(block.tasks[0])}`
          : ""}
      </p>
    </div>
  );
}

export default function WeekMatrix({
  weekDays,
  tasks,
  subjects,
  dailyTargetMinutes,
  dailyTargetTasks = 5,
  dailyTargetUnit = "task",
  studentId,
  draftMode,
  deletingId,
  menuBusy,
  weekDayOptions,
  taskCountForDate,
  onTasksChange,
  persistPositions,
  onPersistError,
  onAddTask,
  onQuickAddSuccess,
  onQuickAddError,
  quickAddRef,
  onEdit,
  onCopy,
  onMove,
  onRepeat,
  onPrepareSplit,
  onSplit,
  onDelete,
}: {
  weekDays: Date[];
  tasks: MatrixTask[];
  subjects: ProgramSubject[];
  dailyTargetMinutes: number | null;
  dailyTargetTasks: number | null;
  dailyTargetUnit: DailyTargetUnit;
  studentId: string;
  draftMode: boolean;
  deletingId: string | null;
  menuBusy: boolean;
  weekDayOptions: WeekDayOption[];
  taskCountForDate: (date: string) => number;
  onTasksChange: (next: MatrixTask[]) => void;
  persistPositions: (
    updates: { id: string; plan_date?: string; order_index: number }[]
  ) => Promise<{ message: string } | null>;
  onPersistError: (message: string) => void;
  onAddTask: (dateStr: string, subjectId: number | null) => void;
  onQuickAddSuccess: (planDate: string) => void;
  onQuickAddError: (message: string) => void;
  quickAddRef: (dateStr: string, handle: DayQuickAddHandle | null) => void;
  onEdit: (taskId: string) => Promise<void>;
  onCopy: (taskId: string) => Promise<void>;
  onMove: (taskId: string, dateStr: string) => Promise<void>;
  onRepeat: (taskId: string, weeks: number) => Promise<void>;
  onPrepareSplit: (taskId: string) => Promise<boolean>;
  onSplit: (taskId: string, dateStr: string) => Promise<void>;
  onDelete: (taskId: string) => void;
}) {
  const [activeBlock, setActiveBlock] = useState<TaskBlock | null>(null);
  /** lg = 1024px — aynı anda iki görünüm mount edilmesin (dnd id çakışması). */
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const weekDateStrs = useMemo(
    () => weekDays.map((d) => toISODate(d)),
    [weekDays]
  );

  const { blocksByDate, slotCount } = useMemo(
    () => buildBlocksByDate(tasks, subjects, weekDateStrs),
    [tasks, subjects, weekDateStrs]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, MatrixTask[]>();
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

  const allBlockIds = useMemo(() => {
    const ids: string[] = [];
    for (const dateStr of weekDateStrs) {
      for (const block of blocksByDate.get(dateStr) ?? []) {
        ids.push(block.blockId);
      }
    }
    return ids;
  }, [blocksByDate, weekDateStrs]);

  const resolveDropTarget = (
    overId: string
  ): { dateStr: string; slotIndex: number } | null => {
    const cell = parseCellDroppableId(overId);
    if (cell) return cell;
    if (isBlockDragId(overId)) {
      const found = findBlockById(blocksByDate, overId);
      if (!found) return null;
      return { dateStr: found.dateStr, slotIndex: found.slotIndex };
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const found = findBlockById(blocksByDate, id);
    setActiveBlock(found?.block ?? null);
  };

  const handleDragCancel = () => {
    setActiveBlock(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveBlock(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    if (!isBlockDragId(activeId)) return;

    const from = findBlockById(blocksByDate, activeId);
    const to = resolveDropTarget(overId);
    if (!from || !to) return;

    const samePlace =
      from.dateStr === to.dateStr && from.slotIndex === to.slotIndex;
    if (samePlace) return;

    const prevTasks = tasks;
    const moving = from.block;

    if (from.dateStr === to.dateStr) {
      const dayBlocks = [...(blocksByDate.get(from.dateStr) ?? [])];
      const oldIndex = from.slotIndex;
      let newIndex = Math.min(to.slotIndex, dayBlocks.length - 1);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(dayBlocks, oldIndex, newIndex);
      const flattened = flattenBlocksToTasks(reordered, from.dateStr);

      onTasksChange([
        ...prevTasks.filter((t) => t.plan_date !== from.dateStr),
        ...flattened,
      ]);

      const error = await persistPositions(
        flattened.map((t) => ({ id: t.id, order_index: t.order_index }))
      );
      if (error) {
        onTasksChange(prevTasks);
        onPersistError("Sıralama kaydedilemedi: " + error.message);
      }
      return;
    }

    // Farklı gün — bloğu taşı
    const sourceBlocks = (blocksByDate.get(from.dateStr) ?? []).filter(
      (b) => b.blockId !== moving.blockId
    );
    const targetBlocks = [...(blocksByDate.get(to.dateStr) ?? [])];
    const insertAt = Math.min(to.slotIndex, targetBlocks.length);
    const movedBlock: TaskBlock = {
      ...moving,
      planDate: to.dateStr,
    };
    targetBlocks.splice(insertAt, 0, movedBlock);

    const reindexedSource = flattenBlocksToTasks(sourceBlocks, from.dateStr);
    const reindexedTarget = flattenBlocksToTasks(targetBlocks, to.dateStr);

    onTasksChange([
      ...prevTasks.filter(
        (t) => t.plan_date !== from.dateStr && t.plan_date !== to.dateStr
      ),
      ...reindexedSource,
      ...reindexedTarget,
    ]);

    const error = await persistPositions([
      ...reindexedSource.map((t) => ({
        id: t.id,
        plan_date: from.dateStr,
        order_index: t.order_index,
      })),
      ...reindexedTarget.map((t) => ({
        id: t.id,
        plan_date: to.dateStr,
        order_index: t.order_index,
      })),
    ]);

    if (error) {
      onTasksChange(prevTasks);
      onPersistError("Taşıma kaydedilemedi: " + error.message);
    }
  };

  const slotIndexes = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => i),
    [slotCount]
  );

  const matrixGrid = (
    <div className="overflow-auto rounded-xl border border-[var(--border)]">
      <div
        className="min-w-[56rem]"
        style={{
          display: "grid",
          gridTemplateColumns: `2.75rem repeat(7, minmax(7rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-[var(--border)] bg-[var(--surface)]" />
        {weekDays.map((day, colIndex) => {
          const dateStr = toISODate(day);
          return (
            <MatrixDayHeader
              key={dateStr}
              day={day}
              colIndex={colIndex}
              dayTasks={tasksByDate.get(dateStr) ?? []}
              dailyTargetMinutes={dailyTargetMinutes}
              dailyTargetTasks={dailyTargetTasks}
              dailyTargetUnit={dailyTargetUnit}
              isToday={isTodayDate(day)}
            />
          );
        })}

        {slotIndexes.map((slotIndex) => (
          <div key={`slot-${slotIndex}`} className="contents">
            <div className="sticky left-0 z-10 flex items-start justify-center border-b border-r border-[var(--border)] bg-[var(--surface)] px-1 pt-2">
              <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
                {slotIndex + 1}
              </span>
            </div>
            {weekDateStrs.map((dateStr) => {
              const dayBlocks = blocksByDate.get(dateStr) ?? [];
              const block = dayBlocks[slotIndex] ?? null;
              return (
                <MatrixCell
                  key={`${dateStr}-${slotIndex}`}
                  dateStr={dateStr}
                  slotIndex={slotIndex}
                  block={block}
                  weekDays={weekDayOptions}
                  menuBusy={menuBusy}
                  deletingId={deletingId}
                  onAdd={() => onAddTask(dateStr, null)}
                  onEdit={onEdit}
                  onCopy={onCopy}
                  onMove={onMove}
                  onRepeat={onRepeat}
                  onPrepareSplit={onPrepareSplit}
                  onSplit={onSplit}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        ))}

        {/* Hızlı ekle satırı */}
        <div className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-1 py-0.5">
          <p className="text-center text-[9px] font-medium text-[var(--text-muted)] opacity-50">
            +
          </p>
        </div>
        {weekDateStrs.map((dateStr) => (
          <div
            key={`qa-${dateStr}`}
            data-plan-date={dateStr}
            tabIndex={0}
            className="group/qa border-r border-[var(--border)] px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          >
            <DayQuickAdd
              ref={(handle) => quickAddRef(dateStr, handle)}
              studentId={studentId}
              subjects={subjects}
              planDate={dateStr}
              taskCountForDate={taskCountForDate}
              draftMode={draftMode}
              onSuccess={onQuickAddSuccess}
              onError={onQuickAddError}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const mobileList = (
    <div className="space-y-3">
      {weekDays.map((day, colIndex) => {
        const dateStr = toISODate(day);
        const dayTasks = tasksByDate.get(dateStr) ?? [];
        const dayBlocks = blocksByDate.get(dateStr) ?? [];
        return (
          <div
            key={dateStr}
            data-plan-date={dateStr}
            tabIndex={0}
            className={`rounded-xl border p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
              isTodayDate(day)
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <MatrixDayHeader
              day={day}
              colIndex={colIndex}
              dayTasks={dayTasks}
              dailyTargetMinutes={dailyTargetMinutes}
              dailyTargetTasks={dailyTargetTasks}
              dailyTargetUnit={dailyTargetUnit}
              isToday={isTodayDate(day)}
            />
            <div className="mt-2 space-y-2">
              {dayBlocks.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAddTask(dateStr, null)}
                  className="flex w-full items-center justify-center rounded-lg border border-dashed border-[var(--border)] py-3 text-[var(--text-muted)] hover:text-[var(--accent)]"
                  aria-label="Görev ekle"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : (
                dayBlocks.map((block, slotIndex) => (
                  <MatrixCell
                    key={block.blockId}
                    dateStr={dateStr}
                    slotIndex={slotIndex}
                    block={block}
                    weekDays={weekDayOptions}
                    menuBusy={menuBusy}
                    deletingId={deletingId}
                    onAdd={() => onAddTask(dateStr, null)}
                    onEdit={onEdit}
                    onCopy={onCopy}
                    onMove={onMove}
                    onRepeat={onRepeat}
                    onPrepareSplit={onPrepareSplit}
                    onSplit={onSplit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
            <div className="mt-2">
              <DayQuickAdd
                ref={(handle) => quickAddRef(dateStr, handle)}
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
      })}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={allBlockIds}
        strategy={verticalListSortingStrategy}
      >
        {isDesktop ? matrixGrid : mobileList}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="w-44">
            <DragPreview block={activeBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Droppable id üretimi — test / dış kullanım */
export { cellDroppableId };
