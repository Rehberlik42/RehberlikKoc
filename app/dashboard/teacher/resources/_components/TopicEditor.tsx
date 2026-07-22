"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { ChevronLeft, GripVertical, Link2, Minus, Plus, Unlink, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TopicDraft } from "./resource-types";

let topicIdSeq = 0;

export function createTopicDraft(
  partial?: Partial<Pick<TopicDraft, "name" | "target_count" | "topic_id">>
): TopicDraft {
  topicIdSeq += 1;
  return {
    tempId: `topic-${topicIdSeq}-${Date.now()}`,
    name: partial?.name ?? "",
    target_count: partial?.target_count ?? 0,
    topic_id: partial?.topic_id ?? null,
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

interface CurriculumTopic {
  id: number;
  name: string;
  parent_id: number | null;
}

interface TopicEditorProps {
  topics: TopicDraft[];
  onChange: (topics: TopicDraft[]) => void;
  /** Merkezi müfredat konusu bağlama için ders id'si. Yoksa Bağla gizlenir. */
  subjectId?: number | null;
}

function TopicLinkPicker({
  topic,
  curriculumTopics,
  disabled,
  onLink,
}: {
  topic: TopicDraft;
  curriculumTopics: CurriculumTopic[];
  disabled: boolean;
  onLink: (tempId: string, topicId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"root" | "children">("root");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        curriculumTopics
          .map((t) => t.parent_id)
          .filter((id): id is number => id !== null)
      ),
    [curriculumTopics]
  );

  const hasHierarchy = parentIdsWithChildren.size > 0;

  const rootTopics = useMemo(() => {
    if (!hasHierarchy) return curriculumTopics;
    return curriculumTopics.filter((t) => t.parent_id === null);
  }, [curriculumTopics, hasHierarchy]);

  const childTopics = useMemo(() => {
    if (selectedParentId == null) return [];
    return curriculumTopics.filter((t) => t.parent_id === selectedParentId);
  }, [curriculumTopics, selectedParentId]);

  const linkedName = useMemo(() => {
    if (topic.topic_id == null) return null;
    return curriculumTopics.find((t) => t.id === topic.topic_id)?.name ?? null;
  }, [topic.topic_id, curriculumTopics]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openPicker = () => {
    if (disabled) return;
    setPickerStep("root");
    setSelectedParentId(null);
    setOpen((v) => !v);
  };

  const selectTopic = (id: number) => {
    onLink(topic.tempId, id);
    setOpen(false);
  };

  const selectRoot = (t: CurriculumTopic) => {
    if (hasHierarchy && parentIdsWithChildren.has(t.id)) {
      setSelectedParentId(t.id);
      setPickerStep("children");
      return;
    }
    // Yaprak veya hiyerarşisiz
    selectTopic(t.id);
  };

  if (disabled) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={openPicker}
        title={
          linkedName
            ? `Bağlı: ${linkedName}`
            : "Merkezi müfredat konusuna bağla"
        }
        className={`flex max-w-[9.5rem] items-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] font-semibold transition-colors ${
          topic.topic_id != null
            ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
        }`}
      >
        <Link2 className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {linkedName ? `Bağlı: ${linkedName}` : "Bağla"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150">
          {topic.topic_id != null && (
            <button
              type="button"
              onClick={() => {
                onLink(topic.tempId, null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Unlink className="h-3.5 w-3.5" />
              Bağlantıyı kaldır
            </button>
          )}

          {curriculumTopics.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
              Bu ders için merkezi konu yok.
            </p>
          ) : pickerStep === "children" ? (
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  setPickerStep("root");
                  setSelectedParentId(null);
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <ChevronLeft className="h-3 w-3" />
                Ana üniteye dön
              </button>
              {childTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTopic(t.id)}
                  className="flex w-full items-center px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
                >
                  {t.name}
                </button>
              ))}
              {childTopics.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  Alt konu yok.
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto py-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {hasHierarchy ? "Ana ünite / konu" : "Konu seç"}
              </p>
              {rootTopics.map((t) => {
                const isParent = parentIdsWithChildren.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectRoot(t)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
                  >
                    <span className="truncate">{t.name}</span>
                    {isParent && (
                      <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
                        alt konular →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SortableTopicRow({
  topic,
  index,
  curriculumTopics,
  linkDisabled,
  onNameChange,
  onCountChange,
  onLink,
  onRemove,
  onEnter,
  onPaste,
  inputRef,
}: {
  topic: TopicDraft;
  index: number;
  curriculumTopics: CurriculumTopic[];
  linkDisabled: boolean;
  onNameChange: (tempId: string, name: string) => void;
  onCountChange: (tempId: string, count: number) => void;
  onLink: (tempId: string, topicId: number | null) => void;
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
      className={`flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 transition-all ${
        isDragging ? "z-10 scale-[1.02] opacity-80 shadow-lg shadow-[var(--primary)]/10" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)] active:cursor-grabbing"
        aria-label="Sırayı değiştir"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-5 shrink-0 text-center text-[11px] font-bold text-[var(--text-muted)]">
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
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm text-[var(--text-primary)] placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
      />

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => adjustCount(-1)}
          disabled={topic.target_count <= 0}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--accent)] disabled:opacity-30"
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
          className="w-12 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-1 py-1.5 text-center text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          aria-label="Soru sayısı"
        />
        <button
          type="button"
          onClick={() => adjustCount(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
          aria-label="Soru sayısını artır"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <TopicLinkPicker
        topic={topic}
        curriculumTopics={curriculumTopics}
        disabled={linkDisabled}
        onLink={onLink}
      />

      <button
        type="button"
        onClick={() => onRemove(topic.tempId)}
        className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
        aria-label="Konuyu sil"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TopicEditor({
  topics,
  onChange,
  subjectId = null,
}: TopicEditorProps) {
  const dndId = useId();
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const [curriculumTopics, setCurriculumTopics] = useState<CurriculumTopic[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (subjectId == null) {
      setCurriculumTopics([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, parent_id")
        .eq("subject_id", subjectId)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      if (error) {
        setCurriculumTopics([]);
        return;
      }
      setCurriculumTopics((data ?? []) as CurriculumTopic[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

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
      linked: named.filter((t) => t.topic_id != null).length,
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
    next[idx] = {
      ...next[idx],
      name: first.name,
      target_count: first.target_count,
    };
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

  const updateLink = (tempId: string, topic_id: number | null) => {
    onChange(topics.map((t) => (t.tempId === tempId ? { ...t, topic_id } : t)));
  };

  const removeRow = (tempId: string) => {
    onChange(topics.filter((t) => t.tempId !== tempId));
  };

  const linkDisabled = subjectId == null;

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Konular</h3>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-[10px] font-semibold">
          <span className="rounded-md bg-[var(--primary)]/20 px-2.5 py-1 text-[var(--accent)]">
            Manuel Giriş
          </span>
          <span
            className="cursor-not-allowed px-2.5 py-1 text-[var(--text-muted)]"
            title="Faz 3B — yakında"
          >
            Excel ile Yükle
            <span className="ml-1 text-[8px] uppercase tracking-wider text-[var(--text-muted)]">
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
                  curriculumTopics={curriculumTopics}
                  linkDisabled={linkDisabled}
                  onNameChange={updateName}
                  onCountChange={updateCount}
                  onLink={updateLink}
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
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-white/[0.02] py-2.5 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 hover:text-[var(--accent)]"
      >
        <Plus className="h-4 w-4" />
        Yeni Konu Ekle
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
        <span>
          <span className="font-semibold text-[var(--text-secondary)]">{stats.count}</span> konu
          <span className="mx-1.5 text-[var(--text-primary)]/15">·</span>
          <span className="font-semibold text-[var(--text-secondary)]">{stats.total}</span> soru
          {!linkDisabled && stats.linked > 0 && (
            <>
              <span className="mx-1.5 text-[var(--text-primary)]/15">·</span>
              <span className="font-semibold text-emerald-400">{stats.linked}</span> bağlı
            </>
          )}
        </span>
        <span className="text-[var(--text-muted)]">
          Enter: yeni satır · Ctrl+V: toplu yapıştır · Sürükle: sırala
        </span>
      </div>
    </div>
  );
}
