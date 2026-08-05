"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  X,
} from "lucide-react";
import type { TaskType } from "@/lib/program/task-payload";
import {
  focusNextField,
  isModKey,
  isOpenListboxContext,
  isTextareaTarget,
  isTypingTarget,
  modKeyLabel,
} from "@/lib/program/form-keyboard";
import TaskTypePicker from "../TaskTypePicker";
import SearchableSelect from "../SearchableSelect";
import {
  DAY_LABELS_SHORT,
  computeLoadWarnings,
  distributeTopics,
  summarizeDistribution,
  type BatchTopicRow,
  type DistributeStrategy,
  type PlannedBatchTask,
} from "./batch-utils";
import {
  filterResourcesForTaskType,
  loadBatchResourceTopics,
  loadBatchResources,
  taskTypeUsesTrackedResources,
  type BatchResourceOption,
} from "./batch-data";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40";

interface WeekDayChip {
  dateStr: string;
  label: string;
  short: string;
}

interface Props {
  selectedTopics: BatchTopicRow[];
  weekDays: WeekDayChip[];
  existingMinutesByDate: Map<string, number>;
  existingTaskCountByDate: Map<string, number>;
  dailyTargetMinutes: number | null;
  dailyTargetTasks: number | null;
  dailyTargetUnit: "task" | "minute";
  saving: boolean;
  onSave: (planned: PlannedBatchTask[], settings: BatchSaveSettings) => void;
}

export type BatchSaveSettings = {
  taskType: TaskType;
  durationMinutes: number | null;
  resourceId: number | null;
  coachNote: string;
};

export default function BatchSettings({
  selectedTopics,
  weekDays,
  existingMinutesByDate,
  existingTaskCountByDate,
  dailyTargetMinutes,
  dailyTargetTasks,
  dailyTargetUnit,
  saving,
  onSave,
}: Props) {
  const [taskType, setTaskType] = useState<TaskType>("ders");
  const [duration, setDuration] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [resources, setResources] = useState<BatchResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceTopics, setResourceTopics] = useState<
    { id: number; name: string; topic_id: number | null }[]
  >([]);
  const [showCoachNote, setShowCoachNote] = useState(false);
  const [coachNote, setCoachNote] = useState("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(weekDays.map((d) => d.dateStr))
  );
  const [strategy, setStrategy] = useState<DistributeStrategy>("sirayla");
  const [showPreview, setShowPreview] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const handleSaveRef = useRef<() => void>(() => {});
  const [modLabel] = useState(() => modKeyLabel());

  // Hafta değişince seçili günleri senkron tut
  useEffect(() => {
    setSelectedDates(new Set(weekDays.map((d) => d.dateStr)));
  }, [weekDays]);

  useEffect(() => {
    setExcludedIds(new Set());
  }, [selectedTopics, selectedDates, strategy]);

  const dayLabelByDate = useMemo(() => {
    const map = new Map<string, string>();
    weekDays.forEach((d, i) => {
      map.set(d.dateStr, DAY_LABELS_SHORT[i] ?? d.short);
    });
    return map;
  }, [weekDays]);

  const dayFullLabelByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of weekDays) map.set(d.dateStr, d.label);
    return map;
  }, [weekDays]);

  const durationMinutes = duration.trim() === "" ? 0 : Number(duration) || 0;

  const plannedAll = useMemo(() => {
    const dates = [...selectedDates];
    return distributeTopics(selectedTopics, dates, strategy);
  }, [selectedTopics, selectedDates, strategy]);

  const planned = useMemo(
    () => plannedAll.filter((p) => !excludedIds.has(p.id)),
    [plannedAll, excludedIds]
  );

  const warnings = useMemo(
    () =>
      computeLoadWarnings({
        planned,
        durationMinutes,
        existingMinutesByDate,
        existingTaskCountByDate,
        dailyTargetMinutes,
        dailyTargetTasks,
        dailyTargetUnit,
        dayLabelByDate: dayFullLabelByDate,
      }),
    [
      planned,
      durationMinutes,
      existingMinutesByDate,
      existingTaskCountByDate,
      dailyTargetMinutes,
      dailyTargetTasks,
      dailyTargetUnit,
      dayFullLabelByDate,
    ]
  );

  const summary = useMemo(
    () => summarizeDistribution(planned, durationMinutes, dayLabelByDate),
    [planned, durationMinutes, dayLabelByDate]
  );

  const selectableResources = useMemo(
    () => filterResourcesForTaskType(resources, taskType, resourceId),
    [resources, taskType, resourceId]
  );

  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    try {
      // Seçili konuların dersleri farklı olabilir → tüm aktif kaynaklar
      const list = await loadBatchResources("");
      setResources(list);
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resourceId) {
      setResourceTopics([]);
      return;
    }
    void loadBatchResourceTopics(parseInt(resourceId, 10)).then(setResourceTopics);
  }, [resourceId]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        if (next.size === 1) return prev;
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      // tek-gune stratejisinde tek gün zorla
      if (strategy === "tek-gune") {
        return new Set([dateStr]);
      }
      return next;
    });
  };

  const handleStrategyChange = (next: DistributeStrategy) => {
    setStrategy(next);
    if (next === "tek-gune" && selectedDates.size > 1) {
      const first = [...selectedDates].sort()[0];
      setSelectedDates(new Set([first]));
    }
  };

  const handleSave = () => {
    if (planned.length === 0) return;
    onSave(planned, {
      taskType,
      durationMinutes:
        duration.trim() === "" ? null : Number(duration) || null,
      resourceId: resourceId ? parseInt(resourceId, 10) : null,
      coachNote: coachNote.trim(),
    });
  };

  handleSaveRef.current = handleSave;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isModKey(e)) {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }
      if (e.key !== "Enter" || isModKey(e)) return;
      if (isTextareaTarget(e.target)) return;
      if (isOpenListboxContext(e.target)) return;
      if (
        isTypingTarget(e.target) &&
        panelRef.current &&
        e.target instanceof HTMLElement
      ) {
        e.preventDefault();
        focusNextField(panelRef.current, e.target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      ref={panelRef}
      className="flex h-full min-h-[420px] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Bir kez ayarla
          </p>
          <TaskTypePicker value={taskType} onChange={setTaskType} />

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              <Clock className="h-3.5 w-3.5" />
              Süre (dakika)
            </label>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="örn. 40"
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Kaynak (opsiyonel)
              </p>
              {resourcesLoading && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
              )}
            </div>
            {taskTypeUsesTrackedResources(taskType) ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                Bu türde yalnızca soru bankası / konu anlatımı listelenir.
              </p>
            ) : null}
            <SearchableSelect
              label="Kaynak"
              value={resourceId}
              onChange={setResourceId}
              onOpen={() => {
                void loadResources();
              }}
              options={[
                { value: "", label: "— Kaynak seçin (opsiyonel) —" },
                ...selectableResources.map((r) => {
                  const hintParts: string[] = [];
                  if (r.exam?.name) hintParts.push(r.exam.name);
                  if (r.subject?.name) hintParts.push(r.subject.name);
                  return {
                    value: String(r.id),
                    label: r.name,
                    hint:
                      hintParts.length > 0
                        ? hintParts.join(" · ")
                        : undefined,
                  };
                }),
              ]}
              emptyText={
                resourcesLoading ? "Yükleniyor…" : "Henüz kaynak yok"
              }
            />
            {resourceId && resourceTopics.length > 0 ? (
              <p className="text-[11px] text-[var(--text-muted)]">
                Konu bazlı kaynak: eşleşen kaynak konusu otomatik bağlanır.
              </p>
            ) : null}
          </div>

          {showCoachNote ? (
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <MessageSquare className="h-3.5 w-3.5" />
                Koç Notu
              </label>
              <textarea
                value={coachNote}
                onChange={(e) => setCoachNote(e.target.value)}
                rows={3}
                placeholder="Tüm görevlere eklenecek not…"
                className={`${inputCls} resize-none`}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCoachNote(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            >
              <Plus className="h-3 w-3" />
              Koç notu
            </button>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Dağıtım
          </p>
          <div className="flex flex-wrap gap-1.5">
            {weekDays.map((d, i) => {
              const checked = selectedDates.has(d.dateStr);
              return (
                <label
                  key={d.dateStr}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 focus-within:ring-2 focus-within:ring-[var(--primary)]/40 ${
                    checked
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/20 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDate(d.dateStr)}
                    className="h-3 w-3 rounded border-[var(--border)] accent-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  />
                  {DAY_LABELS_SHORT[i]}
                </label>
              );
            })}
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Dağıtım stratejisi</legend>
            {(
              [
                {
                  value: "sirayla" as const,
                  label: "Sırayla",
                  hint: "Konular seçili günlere round-robin dağılır",
                },
                {
                  value: "hepsi-her-gune" as const,
                  label: "Hepsi her güne",
                  hint: "Her seçili güne tüm konular eklenir",
                },
                {
                  value: "tek-gune" as const,
                  label: "Tek güne",
                  hint: "Tüm konular tek güne yazılır",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--border)] px-3 py-2 transition-colors duration-150 hover:bg-[var(--surface-2)]"
              >
                <input
                  type="radio"
                  name="batch-strategy"
                  checked={strategy === opt.value}
                  onChange={() => handleStrategyChange(opt.value)}
                  className="mt-0.5 accent-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                />
                <span>
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">
                    {opt.label}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    {opt.hint}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {planned.length === 0
              ? "Konu ve gün seçince özet burada görünür"
              : summary}
          </p>
          {warnings.map((w) => (
            <p
              key={w.dateStr}
              className="text-xs font-semibold text-rose-300"
            >
              {w.dayLabel} günlük hedefi{" "}
              {w.unit === "task"
                ? `${w.target} görev`
                : `${w.target} dk`}{" "}
              aşıyor (
              {w.unit === "task"
                ? `${w.totalLoad} görev`
                : `${w.totalLoad} dk`}
              )
            </p>
          ))}
          <button
            type="button"
            disabled={plannedAll.length === 0}
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--text-primary)] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          >
            {showPreview ? "Önizlemeyi gizle" : "Önizle"}
          </button>
          {showPreview && (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {planned.length === 0 ? (
                <li className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">
                  Önizlemede görev kalmadı
                </li>
              ) : (
                planned.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs"
                  >
                    <span className="shrink-0 font-semibold text-[var(--accent)]">
                      {dayLabelByDate.get(p.planDate)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">
                      {p.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExcludedIds((prev) => {
                          const next = new Set(prev);
                          next.add(p.id);
                          return next;
                        });
                      }}
                      className="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                      aria-label="Listeden çıkar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </section>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--border)] p-4">
        <button
          type="button"
          disabled={saving || planned.length === 0}
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving
            ? "Ekleniyor…"
            : `${planned.length} görev ekle`}
        </button>
        <p className="text-center text-[10px] text-[var(--text-muted)]/70">
          Enter sonraki · {modLabel}+Enter ekle · Esc geri
        </p>
      </div>
    </div>
  );
}
