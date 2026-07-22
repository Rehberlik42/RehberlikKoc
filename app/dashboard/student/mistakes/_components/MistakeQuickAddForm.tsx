"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpen,
  CalendarDays,
  Layers,
  ListTree,
  Plus,
  Trash2,
  Library,
  FileText,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppToaster from "@/app/dashboard/_components/AppToaster";
import SearchableSelect from "@/app/dashboard/teacher/students/[id]/_components/SearchableSelect";
import type {
  MistakeCauseType,
  MistakeResourceOption,
  MistakeSubjectOption,
  QuickAddRow,
} from "./mistake-types";

const CUSTOM_RESOURCE = "__custom__";

interface RowState extends QuickAddRow {
  reflectionNote: string;
  studentNote: string;
}

interface Props {
  studentId: string;
  teacherId: string | null;
  subjects: MistakeSubjectOption[];
  resources: MistakeResourceOption[];
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD + N gün (öğlen referansı ile TZ kayması önlenir). */
function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function newRowId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyRow(partial?: Partial<RowState>): RowState {
  return {
    id: newRowId(),
    questionNumber: "",
    causeType: "dikkatsizlik",
    reflectionNote: "",
    studentNote: "",
    ...partial,
  };
}

/** Türkçe karakterleri ASCII'ye yaklaştır (kırmızı ↔ kirmizi). */
function normalizeTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function parseCauseFromToken(token: string): MistakeCauseType | null {
  const n = normalizeTr(token);
  if (
    n.includes("kirmizi") ||
    n.includes("pembe") ||
    n === "k" ||
    n === "bilgi"
  ) {
    return "bilgi_eksigi";
  }
  if (
    n.includes("sari") ||
    n.includes("turuncu") ||
    n === "s" ||
    n === "dikkat"
  ) {
    return "dikkatsizlik";
  }
  return null;
}

/**
 * "3 kırmızı, 7 sarı, 11 pembe" → satırlar + parse edilemeyen parçalar.
 */
export function parseQuickAddText(input: string): {
  rows: Pick<QuickAddRow, "questionNumber" | "causeType">[];
  failed: string[];
} {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const rows: Pick<QuickAddRow, "questionNumber" | "causeType">[] = [];
  const failed: string[] = [];

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*(.+)$/i) ?? part.match(/^(.+?)\s+(\d+)$/i);
    if (!match) {
      failed.push(part);
      continue;
    }

    let questionNumber: string;
    let colorRaw: string;

    if (/^\d+$/.test(match[1])) {
      questionNumber = match[1];
      colorRaw = match[2];
    } else {
      colorRaw = match[1];
      questionNumber = match[2];
    }

    const cause = parseCauseFromToken(colorRaw.trim());
    if (!cause) {
      failed.push(part);
      continue;
    }

    rows.push({ questionNumber, causeType: cause });
  }

  return { rows, failed };
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40";

const labelClass =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]";

export default function MistakeQuickAddForm({
  studentId,
  teacherId,
  subjects,
  resources,
}: Props) {
  const supabase = createClient();

  const [subjectId, setSubjectId] = useState("");
  const [anaUniteId, setAnaUniteId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [resourceValue, setResourceValue] = useState("");
  const [resourceLabel, setResourceLabel] = useState("");
  const [testLabel, setTestLabel] = useState("");
  const [solvedDate, setSolvedDate] = useState(todayISO);
  const [rows, setRows] = useState<RowState[]>([]);
  const [quickText, setQuickText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = useMemo(
    () => selectedSubject?.topics ?? [],
    [selectedSubject]
  );

  const hasHierarchy = useMemo(
    () => topics.some((t) => t.parent_id !== null),
    [topics]
  );

  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        topics
          .map((t) => t.parent_id)
          .filter((id): id is number => id !== null)
      ),
    [topics]
  );

  const anaUniteler = useMemo(
    () => topics.filter((t) => t.parent_id === null),
    [topics]
  );

  const altKonular = useMemo(() => {
    if (!hasHierarchy) return topics;
    if (!anaUniteId) return [];
    return topics.filter((t) => t.parent_id === Number(anaUniteId));
  }, [topics, hasHierarchy, anaUniteId]);

  const selectedAnaUniteIsLeaf =
    Boolean(anaUniteId) && !parentIdsWithChildren.has(Number(anaUniteId));

  const handleSubjectChange = useCallback((id: string) => {
    setSubjectId(id);
    setAnaUniteId("");
    setTopicId("");
  }, []);

  const handleAnaUniteChange = useCallback(
    (id: string) => {
      setAnaUniteId(id);
      if (id && !parentIdsWithChildren.has(Number(id))) {
        setTopicId(id);
      } else {
        setTopicId("");
      }
    },
    [parentIdsWithChildren]
  );

  const handleQuickAdd = useCallback(() => {
    const trimmed = quickText.trim();
    if (!trimmed) return;

    const { rows: parsed, failed } = parseQuickAddText(trimmed);
    if (parsed.length > 0) {
      setRows((prev) => [
        ...prev,
        ...parsed.map((p) =>
          emptyRow({
            questionNumber: p.questionNumber,
            causeType: p.causeType,
          })
        ),
      ]);
      setQuickText("");
    }

    if (failed.length > 0) {
      setParseError(
        `Anlaşılamayan: ${failed.join(", ")}. Örnek: "3 kırmızı, 7 sarı"`
      );
    } else {
      setParseError(null);
    }
  }, [quickText]);

  const updateRow = useCallback(
    (id: string, patch: Partial<RowState>) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const resetForm = useCallback(() => {
    setSubjectId("");
    setAnaUniteId("");
    setTopicId("");
    setResourceValue("");
    setResourceLabel("");
    setTestLabel("");
    setSolvedDate(todayISO());
    setRows([]);
    setQuickText("");
    setParseError(null);
    setFormError(null);
  }, []);

  const handleSave = async () => {
    setFormError(null);

    if (!subjectId) {
      setFormError("Ders seçmelisin.");
      return;
    }

    const effectiveTopicId = selectedAnaUniteIsLeaf
      ? anaUniteId
      : topicId;

    if (topics.length > 0 && !effectiveTopicId) {
      setFormError(
        hasHierarchy
          ? "Ana ünite ve (gerekirse) alt konu seçmelisin."
          : "Konu seçmelisin."
      );
      return;
    }

    if (!testLabel.trim()) {
      setFormError("Test adı/numarası girmelisin.");
      return;
    }

    if (rows.length === 0) {
      setFormError("En az bir soru eklemelisin.");
      return;
    }

    const emptyQ = rows.find((r) => !r.questionNumber.trim());
    if (emptyQ) {
      setFormError("Tüm satırlarda soru numarası dolu olmalı.");
      return;
    }

    const missingReflection = rows.filter(
      (r) =>
        r.causeType === "bilgi_eksigi" && !r.reflectionNote.trim()
    );
    if (missingReflection.length > 0) {
      const nums = missingReflection
        .map((r) => r.questionNumber)
        .join(", ");
      setFormError(
        `Bilgi eksiği satırlarında "Bu sorudan ne öğrendim?" notu zorunlu (soru: ${nums}). Not yazılmadan tekrar takvimi başlamaz.`
      );
      return;
    }

    if (resourceValue === CUSTOM_RESOURCE && !resourceLabel.trim()) {
      setFormError("Kaynak için serbest metin girmelisin veya listeden seç.");
      return;
    }

    setSaving(true);

    const nextReviewDate = addDaysISO(solvedDate, 21);
    const studyResourceId =
      resourceValue && resourceValue !== CUSTOM_RESOURCE
        ? Number(resourceValue)
        : null;
    const label =
      resourceValue === CUSTOM_RESOURCE
        ? resourceLabel.trim()
        : null;

    try {
      const results = await Promise.all(
        rows.map(async (row) => {
          const { data: entry, error: entryError } = await supabase
            .from("mistake_entries")
            .insert({
              student_id: studentId,
              teacher_id: teacherId,
              subject_id: Number(subjectId),
              topic_id: effectiveTopicId ? Number(effectiveTopicId) : null,
              study_resource_id: studyResourceId,
              resource_label: label,
              test_label: testLabel.trim(),
              question_number: row.questionNumber.trim(),
              solved_date: solvedDate,
              cause_type: row.causeType,
              reflection_note:
                row.causeType === "bilgi_eksigi"
                  ? row.reflectionNote.trim()
                  : null,
              student_note: row.studentNote.trim() || null,
              status: "aktif",
              stage: 0,
              next_review_date: nextReviewDate,
            })
            .select("id")
            .single();

          if (entryError || !entry) {
            throw new Error(
              entryError?.message ?? "Kayıt eklenirken hata oluştu."
            );
          }

          const { error: reviewError } = await supabase
            .from("mistake_reviews")
            .insert({
              mistake_entry_id: entry.id,
              review_stage: 1,
              scheduled_date: nextReviewDate,
              result: null,
            });

          if (reviewError) {
            throw new Error(reviewError.message);
          }

          return entry.id;
        })
      );

      toast.success(`${results.length} soru eklendi`);
      resetForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kayıt sırasında hata oluştu.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppToaster />
      <div className="space-y-8">
        {/* Aşama A — Ortak bağlam */}
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              Aşama A
            </p>
            <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              Ortak bağlam
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Bu test için bir kez seç — alttaki tüm sorulara uygulanır.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchableSelect
              label="Ders"
              icon={<BookOpen className="h-3.5 w-3.5" />}
              value={subjectId}
              onChange={handleSubjectChange}
              options={[
                { value: "", label: "— Ders seçin —" },
                ...subjects.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  group: s.examName ?? "Diğer",
                })),
              ]}
              placeholder="— Ders seçin —"
            />

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>
                <CalendarDays className="h-3.5 w-3.5" />
                Tarih
              </span>
              <input
                type="date"
                value={solvedDate}
                onChange={(e) => setSolvedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {subjectId && hasHierarchy && (
            <SearchableSelect
              label="Ana Ünite"
              icon={<Layers className="h-3.5 w-3.5" />}
              value={anaUniteId}
              onChange={handleAnaUniteChange}
              options={[
                { value: "", label: "— Ana ünite seçin —" },
                ...anaUniteler.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  hint: parentIdsWithChildren.has(t.id)
                    ? "alt konular →"
                    : undefined,
                })),
              ]}
              placeholder="— Ana ünite seçin —"
              emptyText="Bu derste ana ünite yok"
            />
          )}

          {subjectId && (!hasHierarchy || (anaUniteId && !selectedAnaUniteIsLeaf)) && (
            <SearchableSelect
              label={hasHierarchy ? "Alt Konu" : "Konu"}
              icon={<ListTree className="h-3.5 w-3.5" />}
              value={topicId}
              onChange={setTopicId}
              options={[
                { value: "", label: "— Konu seçin —" },
                ...altKonular.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              disabled={altKonular.length === 0}
              placeholder="— Konu seçin —"
              emptyText={
                hasHierarchy
                  ? "Bu üniteye ait alt konu yok"
                  : "Bu derse ait konu yok"
              }
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <SearchableSelect
                label="Kaynak (opsiyonel)"
                icon={<Library className="h-3.5 w-3.5" />}
                value={resourceValue}
                onChange={(v) => {
                  setResourceValue(v);
                  if (v !== CUSTOM_RESOURCE) setResourceLabel("");
                }}
                options={[
                  { value: "", label: "— Kaynak yok —" },
                  ...resources.map((r) => ({
                    value: String(r.id),
                    label: r.name,
                  })),
                  {
                    value: CUSTOM_RESOURCE,
                    label: "Listede yok, yaz…",
                  },
                ]}
                placeholder="— Kaynak yok —"
              />
              {resourceValue === CUSTOM_RESOURCE && (
                <input
                  type="text"
                  value={resourceLabel}
                  onChange={(e) => setResourceLabel(e.target.value)}
                  placeholder="Kaynak adını yaz…"
                  className={inputClass}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>
                <FileText className="h-3.5 w-3.5" />
                Test adı / numarası
              </span>
              <input
                type="text"
                value={testLabel}
                onChange={(e) => setTestLabel(e.target.value)}
                placeholder="Örn. Test 12, Deneme 3"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Aşama B — Soru listesi */}
        <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              Aşama B
            </p>
            <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              Yanlış sorular
            </h3>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Hızlı ekle:{" "}
              <span className="text-[var(--text-secondary)]">
                3 kırmızı, 7 sarı, 11 pembe
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>
              <Zap className="h-3.5 w-3.5" />
              Hızlı ekle
            </span>
            <input
              type="text"
              value={quickText}
              onChange={(e) => {
                setQuickText(e.target.value);
                if (parseError) setParseError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAdd();
                }
              }}
              placeholder='Örn. "3 kırmızı, 7 sarı" — Enter ile ekle'
              className={inputClass}
            />
            {parseError && (
              <p className="text-xs text-amber-400">{parseError}</p>
            )}
            <p className="text-[11px] text-[var(--text-muted)]">
              Kırmızı/pembe = bilgi eksiği · Sarı/turuncu = dikkatsizlik
            </p>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-[var(--text-muted)]">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.questionNumber}
                    onChange={(e) =>
                      updateRow(row.id, {
                        questionNumber: e.target.value.replace(/[^\d]/g, ""),
                      })
                    }
                    placeholder="Soru no"
                    className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  />

                  <div className="flex flex-1 flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(row.id, { causeType: "dikkatsizlik" })
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        row.causeType === "dikkatsizlik"
                          ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/50"
                          : "bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" />
                      Dikkatsizlik
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(row.id, { causeType: "bilgi_eksigi" })
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        row.causeType === "bilgi_eksigi"
                          ? "bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/50"
                          : "bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-400" />
                      Bilgi eksiği
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                    aria-label="Satırı sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {row.causeType === "bilgi_eksigi" && (
                  <div className="pl-8">
                    <label className="mb-1 block text-[11px] font-semibold text-rose-300/90">
                      Bu sorudan ne öğrendim? *
                    </label>
                    <textarea
                      value={row.reflectionNote}
                      onChange={(e) =>
                        updateRow(row.id, { reflectionNote: e.target.value })
                      }
                      rows={2}
                      placeholder="Kısa not — tekrar takvimi için zorunlu"
                      className={`${inputClass} min-h-[4rem] resize-y`}
                    />
                  </div>
                )}

                <div className="pl-8">
                  <label className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">
                    Not (opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={row.studentNote}
                    onChange={(e) =>
                      updateRow(row.id, { studentNote: e.target.value })
                    }
                    placeholder="Ek not…"
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--accent)]"
          >
            <Plus className="h-4 w-4" />
            Soru Ekle
          </button>
        </section>

        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {formError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </>
  );
}
