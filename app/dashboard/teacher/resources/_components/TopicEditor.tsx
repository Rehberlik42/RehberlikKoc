"use client";

import { useCallback, useId, useMemo, useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, X } from "lucide-react";
import type { TopicDraft } from "./resource-types";

let topicIdSeq = 0;

export function createTopicDraft(
  partial?: Partial<Pick<TopicDraft, "name" | "target_count">>
): TopicDraft {
  topicIdSeq += 1;
  return {
    tempId: `topic-${topicIdSeq}-${Date.now()}`,
    name: partial?.name ?? "",
    target_count: partial?.target_count ?? 0,
  };
}

export function parseTopicLine(line: string): { name: string; target_count: number } {
  const trimmed = line.trim();
  if (!trimmed) return { name: "", target_count: 0 };

  const tabParts = trimmed.split("\t").map((p) => p.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    const last = tabParts[tabParts.length - 1];
    const count = parseInt(last, 10);
    if (!Number.isNaN(count)) {
      return {
        name: tabParts.slice(0, -1).join(" ").trim(),
        target_count: Math.max(0, count),
      };
    }
  }

  const spaceMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (spaceMatch) {
    return {
      name: spaceMatch[1].trim(),
      target_count: Math.max(0, parseInt(spaceMatch[2], 10)),
    };
  }

  return { name: trimmed, target_count: 0 };
}

function parsePasteLines(text: string): { name: string; target_count: number }[] {
  return text
    .split(/\r?\n/)
    .map(parseTopicLine)
    .filter((p) => p.name.length > 0);
}

interface TopicEditorProps {
  topics: TopicDraft[];
  onChange: (topics: TopicDraft[]) => void;
}

function SortableTopicRow({
  topic,
  index,
  onNameChange,
  onCountChange,
  onRemove,
  onEnter,
  onPaste,
  inputRef,
}: {
  topic: TopicDraft;
  index: number;
  onNameChange: (tempId: string, name: string) => void;
  onCountChange: (tempId: string, count: number) => void;
  onRemove: (tempId: string) => void;
  onEnter: (tempId: string) => void;
  onPaste: (tempId: string, text: string) => void;
  inputRef: (tempId: string, el: HTMLInputElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const adjustCount = (delta: number) => {
    onCountChange(topic.tempId, Math.max(0, topic.target_count + delta));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 transition-all ${
        isDragging ? "z-10 scale-[1.02] opacity-80 shadow-lg shadow-[#7B2FFF]/10" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-lg p-1.5 text-white/25 transition-colors hover:bg-white/5 hover:text-white/50 active:cursor-grabbing"
        aria-label="Sırayı değiştir"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-5 shrink-0 text-center text-[11px] font-bold text-white/30">
        {index + 1}
      </span>

      <input
        ref={(el) => inputRef(topic.tempId, el)}
        type="text"
        value={topic.name}
        onChange={(e) => onNameChange(topic.tempId, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter(topic.tempId);
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (text.includes("\n") || text.includes("\r") || text.includes("\t")) {
            e.preventDefault();
            onPaste(topic.tempId, text);
            return;
          }
          const parsed = parseTopicLine(text);
          if (parsed.name !== text.trim() || parsed.target_count > 0) {
            e.preventDefault();
            onNameChange(topic.tempId, parsed.name);
            onCountChange(topic.tempId, parsed.target_count);
          }
        }}
        placeholder="Konu adı"
        className="min-w-0 flex-1 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
      />

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => adjustCount(-1)}
          disabled={topic.target_count <= 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/40 transition-colors hover:border-[#7B2FFF]/30 hover:bg-[#7B2FFF]/10 hover:text-[#A78BFF] disabled:opacity-30"
          aria-label="Soru sayısını azalt"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min={0}
          value={topic.target_count}
          onChange={(e) =>
            onCountChange(topic.tempId, Math.max(0, parseInt(e.target.value, 10) || 0))
          }
          className="w-12 rounded-lg border border-white/8 bg-white/[0.04] px-1 py-1.5 text-center text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
          aria-label="Soru sayısı"
        />
        <button
          type="button"
          onClick={() => adjustCount(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/40 transition-colors hover:border-[#7B2FFF]/30 hover:bg-[#7B2FFF]/10 hover:text-[#A78BFF]"
          aria-label="Soru sayısını artır"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onRemove(topic.tempId)}
        className="rounded-lg p-1.5 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400"
        aria-label="Konuyu sil"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TopicEditor({ topics, onChange }: TopicEditorProps) {
  const dndId = useId();
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const setInputRef = useCallback((tempId: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(tempId, el);
    else inputRefs.current.delete(tempId);
  }, []);

  const focusTopic = useCallback((tempId: string) => {
    requestAnimationFrame(() => inputRefs.current.get(tempId)?.focus());
  }, []);

  const stats = useMemo(() => {
    const named = topics.filter((t) => t.name.trim());
    return {
      count: named.length,
      total: named.reduce((sum, t) => sum + (t.target_count || 0), 0),
    };
  }, [topics]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.tempId === active.id);
    const newIndex = topics.findIndex((t) => t.tempId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(topics, oldIndex, newIndex));
  };

  const addRow = (afterTempId?: string) => {
    const row = createTopicDraft();
    if (afterTempId == null) {
      onChange([...topics, row]);
      focusTopic(row.tempId);
      return;
    }
    const idx = topics.findIndex((t) => t.tempId === afterTempId);
    const next = [...topics];
    next.splice(idx + 1, 0, row);
    onChange(next);
    focusTopic(row.tempId);
  };

  const handleEnter = (tempId: string) => addRow(tempId);

  const handlePaste = (tempId: string, text: string) => {
    const parsed = parsePasteLines(text);
    if (parsed.length === 0) return;

    const idx = topics.findIndex((t) => t.tempId === tempId);
    if (idx === -1) return;

    const next = [...topics];
    const [first, ...rest] = parsed;
    next[idx] = { ...next[idx], name: first.name, target_count: first.target_count };
    for (const line of rest) {
      next.push(createTopicDraft({ name: line.name, target_count: line.target_count }));
    }
    onChange(next);
    if (rest.length > 0) {
      focusTopic(next[idx + 1].tempId);
    }
  };

  const updateName = (tempId: string, name: string) => {
    onChange(topics.map((t) => (t.tempId === tempId ? { ...t, name } : t)));
  };

  const updateCount = (tempId: string, target_count: number) => {
    onChange(topics.map((t) => (t.tempId === tempId ? { ...t, target_count } : t)));
  };

  const removeRow = (tempId: string) => {
    onChange(topics.filter((t) => t.tempId !== tempId));
  };

  return (
    <div className="space-y-3 border-t border-white/8 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Konular</h3>
        <div className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-0.5 text-[10px] font-semibold">
          <span className="rounded-md bg-[#7B2FFF]/20 px-2.5 py-1 text-[#A78BFF]">
            Manuel Giriş
          </span>
          <span
            className="cursor-not-allowed px-2.5 py-1 text-white/25"
            title="Faz 3B — yakında"
          >
            Excel ile Yükle
            <span className="ml-1 text-[8px] uppercase tracking-wider text-white/20">
              yakında
            </span>
          </span>
        </div>
      </div>

      {topics.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={topics.map((t) => t.tempId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {topics.map((topic, index) => (
                <SortableTopicRow
                  key={topic.tempId}
                  topic={topic}
                  index={index}
                  onNameChange={updateName}
                  onCountChange={updateCount}
                  onRemove={removeRow}
                  onEnter={handleEnter}
                  onPaste={handlePaste}
                  inputRef={setInputRef}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => addRow()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/12 bg-white/[0.02] py-2.5 text-sm font-semibold text-white/45 transition-colors hover:border-[#7B2FFF]/30 hover:bg-[#7B2FFF]/5 hover:text-[#A78BFF]"
      >
        <Plus className="h-4 w-4" />
        Yeni Konu Ekle
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/35">
        <span>
          <span className="font-semibold text-white/55">{stats.count}</span> konu
          <span className="mx-1.5 text-white/15">·</span>
          <span className="font-semibold text-white/55">{stats.total}</span> soru
        </span>
        <span className="text-white/25">
          Enter: yeni satır · Ctrl+V: toplu yapıştır · Sürükle: sırala
        </span>
      </div>
    </div>
  );
}
