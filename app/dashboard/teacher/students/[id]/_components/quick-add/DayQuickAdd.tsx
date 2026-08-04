"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildSuggestedTitle,
  buildTaskInsertPayload,
} from "@/lib/program/task-payload";
import type { ProgramSubject } from "../program-types";
import {
  flattenProgramTopics,
  type BatchTopicRow,
} from "../batch/batch-utils";
import { filterQuickAddTopics, parseQuickAddInput } from "./quick-add-utils";

export type DayQuickAddHandle = {
  open: () => void;
};

interface Props {
  studentId: string;
  subjects: ProgramSubject[];
  planDate: string;
  taskCountForDate: (date: string) => number;
  draftMode: boolean;
  onSuccess: (planDate: string) => void;
  onError: (message: string) => void;
}

const DayQuickAdd = forwardRef<DayQuickAddHandle, Props>(function DayQuickAdd(
  {
    studentId,
    subjects,
    planDate,
    taskCountForDate,
    draftMode,
    onSuccess,
    onError,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatTopics = useMemo(
    () => flattenProgramTopics(subjects),
    [subjects]
  );

  const { query, durationMinutes } = useMemo(
    () => parseQuickAddInput(value),
    [value]
  );

  const suggestions = useMemo(
    () => filterQuickAddTopics(flatTopics, query, 5),
    [flatTopics, query]
  );

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));

  const close = useCallback(() => {
    setOpen(false);
    setValue("");
    setHighlight(0);
  }, []);

  const selectTopic = useCallback(
    async (topic: BatchTopicRow) => {
      if (saving) return;
      setSaving(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaving(false);
        onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
        return;
      }

      const subject = subjects.find((s) => s.id === topic.subjectId);
      const title = buildSuggestedTitle("ders", subject, topic.topicName);
      const details: Record<string, string | number> = {};
      if (durationMinutes != null && durationMinutes > 0) {
        details.estimated_duration_minutes = durationMinutes;
      }

      const { error } = await supabase.from("study_plan_tasks").insert(
        buildTaskInsertPayload({
          studentId,
          teacherId: user.id,
          planDate,
          taskType: "ders",
          title,
          subjectId: topic.subjectId,
          topicId: topic.topicId,
          studyResourceId: null,
          studyResourceTopicId: null,
          details,
          orderIndex: taskCountForDate(planDate),
          draftMode,
        })
      );

      setSaving(false);

      if (error) {
        onError("Hızlı ekleme başarısız: " + error.message);
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      setValue("");
      setHighlight(0);
      onSuccess(planDate);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [
      saving,
      subjects,
      durationMinutes,
      studentId,
      planDate,
      taskCountForDate,
      draftMode,
      onError,
      onSuccess,
    ]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length === 0) return;
      setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlight] ?? suggestions[0];
      if (pick) void selectTopic(pick);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] py-1.5 text-[10px] font-semibold text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.06] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 motion-reduce:transition-none"
      >
        <Plus className="h-3 w-3" />
        Hızlı ekle
      </button>
    );
  }

  return (
    <div className="relative space-y-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="konu veya konu 40…"
          className="w-full rounded-lg border border-[var(--primary)]/40 bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-white/25 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 disabled:opacity-50"
          aria-autocomplete="list"
          aria-controls={`quick-add-list-${planDate}`}
          aria-expanded={suggestions.length > 0}
        />
        {saving && (
          <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />
        )}
      </div>

      {query && suggestions.length > 0 && (
        <ul
          id={`quick-add-list-${planDate}`}
          role="listbox"
          className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          {suggestions.map((opt, i) => (
            <li key={opt.key} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                disabled={saving}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => void selectTopic(opt)}
                className={`flex w-full flex-col items-start px-2.5 py-1.5 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]/40 ${
                  i === highlight
                    ? "bg-[var(--primary)]/15 text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className="text-[11px] font-medium leading-snug">
                  {opt.label}
                </span>
                {durationMinutes != null && durationMinutes > 0 ? (
                  <span className="text-[9px] text-[var(--text-muted)]">
                    {durationMinutes} dk
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {query && suggestions.length === 0 && (
        <p className="px-1 text-[10px] text-[var(--text-muted)]">Eşleşme yok</p>
      )}
    </div>
  );
});

export default DayQuickAdd;
