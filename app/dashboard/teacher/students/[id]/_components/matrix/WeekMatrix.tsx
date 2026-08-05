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
import { arrayMove } from "@dnd-kit/sortable";
import { getTaskTypeIcon } from "@/lib/program/task-type-icons";
import type { ProgramSubject } from "../program-types";
import DayQuickAdd, {
  type DayQuickAddHandle,
} from "../quick-add/DayQuickAdd";
import MatrixCell from "./MatrixCell";
import MatrixDayHeader from "./MatrixDayHeader";
import {
  buildMatrixRows,
  cellDroppableId,
  getActivityShortLabel,
  getTaskRowKey,
  getTopicLabel,
  parseCellDroppableId,
  tasksForCell,
  type MatrixRowKey,
  type MatrixTask,
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

function DragPreview({ task }: { task: MatrixTask }) {
  const Icon = getTaskTypeIcon(task.task_type);
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--surface)] px-2 py-1.5 shadow-lg">
      <Icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      <div className="min-w-0">
        <p className="truncate text-[12px] text-[var(--text-primary)]">
          {getTopicLabel(task)}
        </p>
        <p className="truncate text-[11px] text-[var(--text-secondary)]">
          {getActivityShortLabel(task)}
        </p>
      </div>
    </div>
  );
}

export default function WeekMatrix({
  weekDays,
  tasks,
  subjects,
  dailyTargetMinutes,
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
  const [activeTask, setActiveTask] = useState<MatrixTask | null>(null);
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

  const rows = useMemo(
    () => buildMatrixRows(tasks, subjects),
    [tasks, subjects]
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

  const activeRowKey = activeTask ? getTaskRowKey(activeTask) : null;

  const findContainer = (
    id: string
  ): { rowKey: MatrixRowKey; dateStr: string } | null => {
    const parsed = parseCellDroppableId(id);
    if (parsed) {
      return {
        rowKey: parsed.rowKey as MatrixRowKey,
        dateStr: parsed.dateStr,
      };
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    return { rowKey: getTaskRowKey(task), dateStr: task.plan_date };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveTask(tasks.find((t) => t.id === id) ?? null);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
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

    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to) return;

    // Satır kilidi — başka derse bırakma engeli
    if (from.rowKey !== to.rowKey) return;

    const prevTasks = tasks;
    const fromDate = from.dateStr;
    const toDate = to.dateStr;

    if (fromDate === toDate) {
      const dayTasks = [...(tasksByDate.get(fromDate) ?? [])];
      const cellTasks = dayTasks.filter(
        (t) => getTaskRowKey(t) === from.rowKey
      );
      const oldCellIndex = cellTasks.findIndex((t) => t.id === activeId);
      if (oldCellIndex < 0) return;

      let newCellIndex: number;
      if (parseCellDroppableId(overId)) {
        newCellIndex = cellTasks.length - 1;
      } else {
        newCellIndex = cellTasks.findIndex((t) => t.id === overId);
      }
      if (newCellIndex < 0 || oldCellIndex === newCellIndex) return;

      const reorderedCell = arrayMove(cellTasks, oldCellIndex, newCellIndex);
      const cellIdSet = new Set(reorderedCell.map((t) => t.id));
      let cellPtr = 0;
      const merged = dayTasks.map((t) => {
        if (!cellIdSet.has(t.id)) return t;
        const next = reorderedCell[cellPtr++];
        return next;
      });
      const reindexed = merged.map((t, i) => ({ ...t, order_index: i }));

      onTasksChange([
        ...prevTasks.filter((t) => t.plan_date !== fromDate),
        ...reindexed,
      ]);

      const error = await persistPositions(
        reindexed.map((t) => ({ id: t.id, order_index: t.order_index }))
      );
      if (error) {
        onTasksChange(prevTasks);
        onPersistError("Sıralama kaydedilemedi: " + error.message);
      }
      return;
    }

    // Aynı satır, farklı gün
    const sourceDay = (tasksByDate.get(fromDate) ?? []).filter(
      (t) => t.id !== activeId
    );
    const targetDay = [...(tasksByDate.get(toDate) ?? [])];

    let insertIndex: number;
    if (parseCellDroppableId(overId)) {
      // Hedef hücrenin görevlerinin sonuna — gün listesinde o hücrenin son görevinin ardı
      const targetCell = targetDay.filter(
        (t) => getTaskRowKey(t) === to.rowKey
      );
      if (targetCell.length === 0) {
        insertIndex = targetDay.length;
      } else {
        const last = targetCell[targetCell.length - 1];
        insertIndex = targetDay.findIndex((t) => t.id === last.id) + 1;
      }
    } else {
      const overIndex = targetDay.findIndex((t) => t.id === overId);
      insertIndex = overIndex >= 0 ? overIndex : targetDay.length;
    }

    const moved: MatrixTask = {
      ...activeItem,
      plan_date: toDate,
      order_index: insertIndex,
    };
    targetDay.splice(insertIndex, 0, moved);

    const reindexedSource = sourceDay.map((t, i) => ({
      ...t,
      order_index: i,
    }));
    const reindexedTarget = targetDay.map((t, i) => ({
      ...t,
      order_index: i,
    }));

    onTasksChange([
      ...prevTasks.filter(
        (t) => t.plan_date !== fromDate && t.plan_date !== toDate
      ),
      ...reindexedSource,
      ...reindexedTarget,
    ]);

    const error = await persistPositions([
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
      onTasksChange(prevTasks);
      onPersistError("Taşıma kaydedilemedi: " + error.message);
    }
  };

  const otherRowKeys = new Set(
    rows.filter((r) => r.subjectId == null).map((r) => r.rowKey)
  );
  const firstOtherIndex = rows.findIndex((r) => r.subjectId == null);

  const matrixGrid = (
    <div className="overflow-auto rounded-xl border border-[var(--border)]">
      <div
        className="min-w-[56rem]"
        style={{
          display: "grid",
          gridTemplateColumns: `9.5rem repeat(7, minmax(7rem, 1fr))`,
        }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-[var(--border)] bg-[var(--surface)] px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Ders
          </p>
        </div>
        {weekDays.map((day, colIndex) => {
          const dateStr = toISODate(day);
          return (
            <MatrixDayHeader
              key={dateStr}
              day={day}
              colIndex={colIndex}
              dayTasks={tasksByDate.get(dateStr) ?? []}
              dailyTargetMinutes={dailyTargetMinutes}
              isToday={isTodayDate(day)}
            />
          );
        })}

        {rows.map((row, rowIndex) => {
          const dimmed = Boolean(activeRowKey && activeRowKey !== row.rowKey);
          const highlight =
            Boolean(activeRowKey && activeRowKey === row.rowKey);
          const showOtherHeading =
            rowIndex === firstOtherIndex && otherRowKeys.size > 0;

          return (
            <div key={row.rowKey} className="contents">
              {showOtherHeading ? (
                <>
                  <div className="sticky left-0 z-10 col-span-1 border-b border-r border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Diğer
                    </p>
                  </div>
                  {weekDateStrs.map((dateStr) => (
                    <div
                      key={`other-h-${dateStr}`}
                      className="border-b border-r border-[var(--border)] bg-[var(--surface-2)]"
                    />
                  ))}
                </>
              ) : null}

              <div
                className={`sticky left-0 z-10 flex items-center border-b border-r border-[var(--border)] bg-[var(--surface)] px-2 py-2 ${
                  dimmed ? "opacity-35" : ""
                } ${highlight ? "bg-[var(--primary)]/10" : ""}`}
              >
                <p className="text-[12px] font-semibold leading-snug text-[var(--text-primary)]">
                  {row.label}
                </p>
              </div>
              {weekDateStrs.map((dateStr) => (
                <MatrixCell
                  key={`${row.rowKey}-${dateStr}`}
                  rowKey={row.rowKey}
                  dateStr={dateStr}
                  tasks={tasksForCell(tasks, row.rowKey, dateStr)}
                  dimmed={dimmed}
                  canAdd={row.subjectId != null || row.otherTaskType != null}
                  weekDays={weekDayOptions}
                  menuBusy={menuBusy}
                  deletingId={deletingId}
                  onAdd={() => onAddTask(dateStr, row.subjectId)}
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
          );
        })}

        {/* Hızlı ekle satırı */}
        <div className="sticky left-0 z-10 border-r border-[var(--border)] bg-[var(--surface)] px-2 py-2">
          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
            Hızlı ekle
          </p>
        </div>
        {weekDateStrs.map((dateStr) => (
          <div
            key={`qa-${dateStr}`}
            data-plan-date={dateStr}
            tabIndex={0}
            className="border-r border-[var(--border)] px-1.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
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
              isToday={isTodayDate(day)}
            />
            <div className="mt-2 space-y-2">
              {rows.map((row) => {
                const cellTasks = tasksForCell(tasks, row.rowKey, dateStr);
                if (cellTasks.length === 0) return null;
                return (
                  <div key={row.rowKey}>
                    <p className="mb-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {row.label}
                    </p>
                    <MatrixCell
                      rowKey={row.rowKey}
                      dateStr={dateStr}
                      tasks={cellTasks}
                      dimmed={false}
                      canAdd
                      weekDays={weekDayOptions}
                      menuBusy={menuBusy}
                      deletingId={deletingId}
                      onAdd={() => onAddTask(dateStr, row.subjectId)}
                      onEdit={onEdit}
                      onCopy={onCopy}
                      onMove={onMove}
                      onRepeat={onRepeat}
                      onPrepareSplit={onPrepareSplit}
                      onSplit={onSplit}
                      onDelete={onDelete}
                    />
                  </div>
                );
              })}
              {dayTasks.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)]">—</p>
              ) : null}
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
      {isDesktop ? matrixGrid : mobileList}

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-40">
            <DragPreview task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Droppable id üretimi — test / dış kullanım */
export { cellDroppableId };
