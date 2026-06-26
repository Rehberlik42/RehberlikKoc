"use client";

import { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  CalendarDays,
  Building2,
  Save,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Circle,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/app/dashboard/teacher/students/[id]/_components/SearchableSelect";
import type { ExamOption, SubjectOption } from "./MockExamsClient";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopicOption {
  id: number;
  name: string;
  subject_id: number;
  order_index: number;
}

interface TopicErrorInput {
  topicId: number;
  wrong: string;
}

interface SubjectInput {
  subjectId: number;
  subjectName: string;
  color: string | null;
  correct: string;
  wrong: string;
  empty: string;
  errors: TopicErrorInput[];
}

interface Props {
  exams: ExamOption[];
  subjects: SubjectOption[];
  studentId?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcNet(correct: string, wrong: string): number {
  const c = parseInt(correct) || 0;
  const w = parseInt(wrong) || 0;
  return c - w / 4;
}

function sumDistributedErrors(errors: TopicErrorInput[]): number {
  return errors.reduce((sum, e) => {
    if (!e.topicId) return sum;
    const w = parseInt(e.wrong);
    if (!w || w <= 0) return sum;
    return sum + w;
  }, 0);
}

function getValidTopicErrors(
  errors: TopicErrorInput[]
): { topicId: number; wrong: number }[] {
  return errors
    .filter((e) => e.topicId > 0 && (parseInt(e.wrong) || 0) > 0)
    .map((e) => ({ topicId: e.topicId, wrong: parseInt(e.wrong) || 0 }));
}

function rowHasData(row: SubjectInput): boolean {
  return row.correct !== "" || row.wrong !== "" || row.empty !== "";
}

function useAnimatedNumber(target: number, active: boolean, duration = 500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active, duration]);

  return value;
}

// ─── Small subject row ────────────────────────────────────────────────────────
function SubjectInputRow({
  row,
  topics,
  onChange,
}: {
  row: SubjectInput;
  topics: TopicOption[];
  onChange: (next: SubjectInput) => void;
}) {
  const net = calcNet(row.correct, row.wrong);
  const hasData = rowHasData(row);
  const totalWrong = parseInt(row.wrong) || 0;
  const distributedWrong = sumDistributedErrors(row.errors);
  const distributionOverflow = distributedWrong > totalWrong;

  const updateError = (index: number, patch: Partial<TopicErrorInput>) => {
    const nextErrors = row.errors.map((err, i) =>
      i === index ? { ...err, ...patch } : err
    );
    onChange({ ...row, errors: nextErrors });
  };

  const removeError = (index: number) => {
    onChange({ ...row, errors: row.errors.filter((_, i) => i !== index) });
  };

  const addError = () => {
    onChange({
      ...row,
      errors: [...row.errors, { topicId: 0, wrong: "1" }],
    });
  };

  const selectedTopicIds = new Set(
    row.errors.map((e) => e.topicId).filter((id) => id > 0)
  );

  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
        hasData
          ? "border-[var(--primary)]/30 bg-[var(--surface)]/60 shadow-[0_0_16px_rgba(123,47,255,0.12)]"
          : "border-[var(--border)] bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-5 rounded-full shrink-0"
            style={{ background: row.color ?? "#4F7CFF" }}
          />
          <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
            {row.subjectName}
          </p>
        </div>
        {hasData && (
          <span
            className={`text-xs font-black tabular-nums shrink-0 ${
              net >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {net.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniInput
          icon={<CheckCircle2 className="w-3 h-3 text-green-400" />}
          value={row.correct}
          onChange={(v) => onChange({ ...row, correct: v })}
          color="#22c55e"
        />
        <MiniInput
          icon={<XCircle className="w-3 h-3 text-red-400" />}
          value={row.wrong}
          onChange={(v) => onChange({ ...row, wrong: v })}
          color="#ef4444"
        />
        <MiniInput
          icon={<Circle className="w-3 h-3 text-[var(--text-muted)]" />}
          value={row.empty}
          onChange={(v) => onChange({ ...row, empty: v })}
          color="#64748b"
        />
      </div>

      {hasData && (
        <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Zayıf konular
            </p>
            {(row.errors.length > 0 || totalWrong > 0) && (
              <p
                className={`text-[10px] tabular-nums ${
                  distributionOverflow ? "font-semibold text-red-400" : "text-[var(--text-muted)]"
                }`}
              >
                Konulara dağıtılan: {distributedWrong} / {totalWrong} yanlış
              </p>
            )}
          </div>

          {row.errors.length > 0 && (
            <div className="space-y-2">
              {row.errors.map((err, errIdx) => {
                const topicOptions = [
                  { value: "", label: "Konu seçin" },
                  ...topics
                    .filter(
                      (t) =>
                        !selectedTopicIds.has(t.id) || t.id === err.topicId
                    )
                    .map((t) => ({
                      value: String(t.id),
                      label: t.name,
                    })),
                ];

                return (
                  <div
                    key={`${row.subjectId}-err-${errIdx}`}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                  >
                    <div className="min-w-0 flex-1">
                      <SearchableSelect
                        label="Konu"
                        value={err.topicId ? String(err.topicId) : ""}
                        onChange={(v) =>
                          updateError(errIdx, {
                            topicId: v ? parseInt(v, 10) : 0,
                          })
                        }
                        options={topicOptions}
                        placeholder="Konu seçin"
                        emptyText={
                          topics.length === 0
                            ? "Bu ders için konu tanımlı değil"
                            : "Konu bulunamadı"
                        }
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-20 shrink-0">
                        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                          Yanlış
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={err.wrong}
                          onChange={(e) =>
                            updateError(errIdx, { wrong: e.target.value })
                          }
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-center text-sm font-bold text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeError(errIdx)}
                        aria-label="Konu satırını sil"
                        className="mb-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:border-red-400/30 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {distributionOverflow && (
            <p className="text-[11px] text-red-400">
              Konulara dağıttığınız yanlış sayısı ders toplamını aşıyor.
            </p>
          )}

          <button
            type="button"
            onClick={addError}
            disabled={topics.length === 0}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            Yanlış yapılan konu ekle
          </button>
        </div>
      )}
    </div>
  );
}

function MiniInput({
  icon,
  value,
  onChange,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div className="relative">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {icon}
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-7 pr-2 text-center text-sm font-bold text-[var(--text-primary)] placeholder-white/15 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
        style={{ ["--tw-ring-color" as string]: `${color}55` }}
      />
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export default function MockExamForm({
  exams,
  subjects,
  studentId,
  onSuccess,
  onError,
}: Props) {
  const supabase = createClient();

  const [examId, setExamId] = useState<string>(
    exams[0] ? String(exams[0].id) : ""
  );
  const [examDate, setExamDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [rows, setRows] = useState<SubjectInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [topicsBySubjectId, setTopicsBySubjectId] = useState<
    Map<number, TopicOption[]>
  >(new Map());

  // Sinav degistiginde dersleri o sinava gore yenile
  useEffect(() => {
    if (!examId) {
      setRows([]);
      return;
    }
    const id = parseInt(examId);
    const filtered = subjects
      .filter((s) => s.exam_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map<SubjectInput>((s) => ({
        subjectId: s.id,
        subjectName: s.name,
        color: s.color,
        correct: "",
        wrong: "",
        empty: "",
        errors: [],
      }));
    setRows(filtered);
  }, [examId, subjects]);

  // Secili sinavin derslerine ait konulari yukle
  useEffect(() => {
    if (!examId) {
      setTopicsBySubjectId(new Map());
      return;
    }

    const examNumericId = parseInt(examId);
    const subjectIds = subjects
      .filter((s) => s.exam_id === examNumericId)
      .map((s) => s.id);

    if (subjectIds.length === 0) {
      setTopicsBySubjectId(new Map());
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, subject_id, order_index")
        .in("subject_id", subjectIds)
        .order("order_index", { ascending: true });

      if (cancelled) return;

      if (error) {
        setTopicsBySubjectId(new Map());
        return;
      }

      const map = new Map<number, TopicOption[]>();
      for (const topic of data ?? []) {
        const list = map.get(topic.subject_id) ?? [];
        list.push(topic as TopicOption);
        map.set(topic.subject_id, list);
      }
      setTopicsBySubjectId(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [examId, subjects]);

  // ─── Canli toplam ─────────────────────────────────────────────────────────
  const { totalNet, totalQuestions, hasAnyData } = useMemo(() => {
    let net = 0;
    let q = 0;
    let any = false;
    for (const r of rows) {
      const c = parseInt(r.correct) || 0;
      const w = parseInt(r.wrong) || 0;
      const e = parseInt(r.empty) || 0;
      if (r.correct !== "" || r.wrong !== "" || r.empty !== "") any = true;
      net += c - w / 4;
      q += c + w + e;
    }
    return { totalNet: net, totalQuestions: q, hasAnyData: any };
  }, [rows]);

  const animatedTotalNet = useAnimatedNumber(totalNet, hasAnyData);

  const hasDistributionOverflow = useMemo(() => {
    return rows.some((r) => {
      if (!rowHasData(r)) return false;
      const totalWrong = parseInt(r.wrong) || 0;
      return sumDistributedErrors(r.errors) > totalWrong;
    });
  }, [rows]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examId) {
      onError("Lütfen sınav türünü seçin.");
      return;
    }
    if (!hasAnyData) {
      onError("En az bir derse veri girmelisiniz.");
      return;
    }

    for (const r of rows) {
      if (!rowHasData(r)) continue;
      const totalWrong = parseInt(r.wrong) || 0;
      if (sumDistributedErrors(r.errors) > totalWrong) {
        onError(
          `'${r.subjectName}' dersinde konulara dağıttığınız yanlış sayısı ders toplamını aşıyor.`
        );
        return;
      }
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      onError("Oturum süresi doldu, tekrar giriş yapın.");
      return;
    }

    // 1) Once mock_exams kaydi
    const { data: mockExam, error: mockExamError } = await supabase
      .from("mock_exams")
      .insert({
        student_id: studentId ?? user.id,
        exam_id: parseInt(examId),
        exam_date: examDate,
        title: title.trim() || null,
        publisher: publisher.trim() || null,
        total_questions: totalQuestions > 0 ? totalQuestions : null,
      })
      .select("id")
      .single();

    if (mockExamError || !mockExam) {
      setLoading(false);
      onError("Deneme kaydedilemedi: " + (mockExamError?.message ?? "Bilinmeyen hata"));
      return;
    }

    // 2) Sonra her ders icin mock_exam_results
    const resultsPayload = rows
      .filter(
        (r) => r.correct !== "" || r.wrong !== "" || r.empty !== ""
      )
      .map((r) => ({
        mock_exam_id: mockExam.id,
        subject_id: r.subjectId,
        correct_count: parseInt(r.correct) || 0,
        wrong_count: parseInt(r.wrong) || 0,
        empty_count: parseInt(r.empty) || 0,
      }));

    if (resultsPayload.length > 0) {
      const { data: insertedResults, error: resultsError } = await supabase
        .from("mock_exam_results")
        .insert(resultsPayload)
        .select("id, subject_id");

      if (resultsError || !insertedResults) {
        await supabase.from("mock_exams").delete().eq("id", mockExam.id);
        setLoading(false);
        onError("Sonuçlar kaydedilemedi: " + resultsError?.message);
        return;
      }

      const resultIdBySubjectId = new Map(
        insertedResults.map((r) => [r.subject_id as number, r.id as number])
      );

      const errorsPayload: {
        mock_exam_result_id: number;
        topic_id: number;
        wrong_count: number;
      }[] = [];

      for (const r of rows) {
        const resultId = resultIdBySubjectId.get(r.subjectId);
        if (!resultId) continue;
        for (const err of getValidTopicErrors(r.errors)) {
          errorsPayload.push({
            mock_exam_result_id: resultId,
            topic_id: err.topicId,
            wrong_count: err.wrong,
          });
        }
      }

      if (errorsPayload.length > 0) {
        const { error: topicErrorsError } = await supabase
          .from("mock_exam_topic_errors")
          .insert(errorsPayload);

        if (topicErrorsError) {
          await supabase
            .from("mock_exam_results")
            .delete()
            .eq("mock_exam_id", mockExam.id);
          await supabase.from("mock_exams").delete().eq("id", mockExam.id);
          setLoading(false);
          onError(
            "Konu hataları kaydedilemedi: " + topicErrorsError.message
          );
          return;
        }
      }
    }

    setLoading(false);

    // Formu sifirla
    setTitle("");
    setPublisher("");
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        correct: "",
        wrong: "",
        empty: "",
        errors: [],
      }))
    );

    onSuccess(`Deneme kaydedildi! Toplam net: ${totalNet.toFixed(2)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-2)]/20 border border-[var(--primary)]/20 flex items-center justify-center">
          <Save className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-[var(--text-primary)] font-bold text-sm">Yeni Deneme Ekle</h3>
          <p className="text-[var(--text-muted)] text-[11px]">
            Sınav türü, tarih ve ders bazlı sonuçlar
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Sinav + Tarih */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Sınav Türü"
            icon={<GraduationCap className="w-3.5 h-3.5" />}
          >
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 pr-8 text-sm text-[var(--text-primary)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={String(ex.id)}>
                  {ex.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tarih" icon={<CalendarDays className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-2)]/40"
            />
          </FormField>
        </div>

        {/* Baslik + Yayinevi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Deneme Adı (opsiyonel)" icon={null}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ör. Genel Deneme 5"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            />
          </FormField>

          <FormField
            label="Yayın (opsiyonel)"
            icon={<Building2 className="w-3.5 h-3.5" />}
          >
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="ör. 3D, Limit, ÖSYM"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-2)]/40"
            />
          </FormField>
        </div>

        {/* Ders bazli giris */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider">
              Ders Bazlı Sonuçlar
            </p>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> D
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-2.5 h-2.5 text-red-400" /> Y
              </span>
              <span className="flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 text-[var(--text-muted)]" /> B
              </span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] border-dashed bg-white/2 px-4 py-6 text-center text-[var(--text-muted)] text-xs">
              Bu sınav türü için ders tanımlanmamış.
            </div>
          ) : (
            <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div
                  key={`${examId}-${row.subjectId}`}
                  className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
                  style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                >
                  <SubjectInputRow
                    row={row}
                    topics={topicsBySubjectId.get(row.subjectId) ?? []}
                    onChange={(next) => {
                      setRows((prev) => {
                        const copy = [...prev];
                        copy[idx] = next;
                        return copy;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toplam ozet */}
        <div className="rounded-xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary-2)]/10 border border-[var(--primary)]/25 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
              Tahmini Toplam Net
            </span>
          </div>
          <span
            className={`text-xl font-black tabular-nums transition-colors duration-300 ${
              totalNet >= 0 ? "text-[var(--text-primary)]" : "text-red-400"
            }`}
          >
            {hasAnyData
              ? `${animatedTotalNet >= 0 ? "+" : ""}${animatedTotalNet.toFixed(2)}`
              : "—"}
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !hasAnyData || hasDistributionOverflow}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-[var(--primary)]/50 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {loading ? "Kaydediliyor…" : "Denemeyi Kaydet"}
        </button>
      </div>
    </form>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────
function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
