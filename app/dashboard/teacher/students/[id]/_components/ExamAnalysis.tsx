"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { BarChart3, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AddExamModal from "./AddExamModal";
import ExamTopicDetail from "./ExamTopicDetail";
import FocusCard from "./FocusCard";
import type {
  ExamOption,
  SubjectOption,
} from "@/app/dashboard/student/mock-exams/_components/MockExamsClient";
import {
  buildFocusRecommendations,
  buildTopicErrorAnalysis,
  computeSubjectAnalysis,
  filterExamsForAnalysis,
  type ExamTypeFilter,
  type FocusRecommendations,
  type LastNFilter,
  type NormalizedExam,
  type RawTopicErrorRecord,
} from "./exam-analysis-utils";

interface SelectedSubject {
  id: number;
  name: string;
  color: string | null;
  examGroup: string | null;
}

interface Props {
  studentId: string;
  exams: { id: number; name: string }[];
  analysisExams: NormalizedExam[];
  topicCountBySubjectId: Record<number, number>;
  examFormOptions: ExamOption[];
  subjectFormOptions: SubjectOption[];
}

const EXAM_TYPE_OPTIONS: { id: ExamTypeFilter; label: string }[] = [
  { id: "TYT", label: "TYT" },
  { id: "AYT", label: "AYT" },
  { id: "TYT+AYT", label: "TYT+AYT" },
];

const LAST_N_OPTIONS: { id: LastNFilter; label: string }[] = [
  { id: 3, label: "Son 3" },
  { id: 5, label: "Son 5" },
  { id: 10, label: "Son 10" },
  { id: "all", label: "Tümü" },
];

function SuccessRing({
  pct,
  color,
  ringId,
  size = 52,
}: {
  pct: number;
  color: string;
  ringId: string;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const cx = size / 2;
  const cy = size / 2;
  const gradId = `examRing-${ringId}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={pct >= 100 ? "#22c55e" : `url(#${gradId})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black tabular-nums text-[var(--text-primary)]">
          %{pct}
        </span>
      </div>
    </div>
  );
}

function FilterButtonGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-[var(--primary)]/20 text-[var(--text-primary)] shadow-[0_0_12px_rgba(123,47,255,0.2)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ExamGroupBadge({ group }: { group: string }) {
  const styles =
    group === "TYT"
      ? "border-[var(--primary-2)]/30 bg-[var(--primary-2)]/15 text-[var(--accent)]"
      : group === "AYT"
        ? "border-[var(--primary)]/30 bg-[var(--primary)]/15 text-[var(--accent)]"
        : group === "LGS"
          ? "border-green-500/30 bg-green-500/15 text-green-400"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]";

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {group}
    </span>
  );
}

export default function ExamAnalysis({
  studentId,
  exams,
  analysisExams,
  topicCountBySubjectId,
  examFormOptions,
  subjectFormOptions,
}: Props) {
  const router = useRouter();
  const [examTypeFilter, setExamTypeFilter] = useState<ExamTypeFilter>("TYT+AYT");
  const [lastN, setLastN] = useState<LastNFilter>(5);
  const [selectedSubject, setSelectedSubject] = useState<SelectedSubject | null>(
    null
  );
  const [addExamOpen, setAddExamOpen] = useState(false);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusRecommendations, setFocusRecommendations] =
    useState<FocusRecommendations | null>(null);

  const filteredExams = useMemo(
    () => filterExamsForAnalysis(analysisExams, examTypeFilter, lastN),
    [analysisExams, examTypeFilter, lastN]
  );

  const subjectRows = useMemo(
    () => computeSubjectAnalysis(filteredExams, topicCountBySubjectId),
    [filteredExams, topicCountBySubjectId]
  );

  const summary = useMemo(() => {
    if (subjectRows.length === 0) return null;
    const avgSuccess =
      subjectRows.reduce((s, r) => s + r.successPct, 0) / subjectRows.length;
    const avgNet =
      subjectRows.reduce((s, r) => s + r.avgNet, 0) / subjectRows.length;
    return {
      subjectCount: subjectRows.length,
      examCount: filteredExams.length,
      avgSuccess: Math.round(avgSuccess),
      avgNet,
    };
  }, [subjectRows, filteredExams.length]);

  const lastNLabel =
    LAST_N_OPTIONS.find((o) => o.id === lastN)?.label ?? `Son ${lastN}`;

  useEffect(() => {
    if (selectedSubject) return;

    let cancelled = false;

    (async () => {
      if (filteredExams.length === 0) {
        setFocusRecommendations({ top3: [], subjectWeakest: [], hasData: false });
        setFocusLoading(false);
        return;
      }

      setFocusLoading(true);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("mock_exam_topic_errors")
        .select(
          `topic_id, wrong_count,
           topic:topics(id, name, order_index),
           result:mock_exam_results!inner(
             id, subject_id, mock_exam_id,
             mock_exam:mock_exams!inner(id, exam_date, title, student_id)
           )`
        )
        .eq("result.mock_exam.student_id", studentId);

      if (cancelled) return;

      if (fetchError) {
        setFocusRecommendations({ top3: [], subjectWeakest: [], hasData: false });
        setFocusLoading(false);
        return;
      }

      const rawErrors = (data ?? []) as RawTopicErrorRecord[];
      const bySubject = new Map<number, RawTopicErrorRecord[]>();

      for (const row of rawErrors) {
        const resultRaw = Array.isArray(row.result) ? row.result[0] : row.result;
        if (!resultRaw) continue;
        const subjectId = resultRaw.subject_id;
        const list = bySubject.get(subjectId) ?? [];
        list.push(row);
        bySubject.set(subjectId, list);
      }

      const subjectTopicAnalyses = subjectRows.map((row) => ({
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        color: row.color,
        analysis: buildTopicErrorAnalysis(
          bySubject.get(row.subjectId) ?? [],
          filteredExams
        ),
      }));

      setFocusRecommendations(
        buildFocusRecommendations(subjectTopicAnalyses, filteredExams.length)
      );
      setFocusLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, filteredExams, subjectRows, selectedSubject]);

  const openSubjectDetail = (row: {
    subjectId: number;
    subjectName: string;
    color: string | null;
    examGroup: string | null;
  }) => {
    setSelectedSubject({
      id: row.subjectId,
      name: row.subjectName,
      color: row.color,
      examGroup: row.examGroup,
    });
  };

  return (
    <div className="space-y-5">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#0d0d2b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />

      <AddExamModal
        open={addExamOpen}
        onClose={() => setAddExamOpen(false)}
        studentId={studentId}
        exams={examFormOptions}
        subjects={subjectFormOptions}
        onSuccess={(message) => {
          setAddExamOpen(false);
          toast.success(message);
          router.refresh();
        }}
        onError={(message) => toast.error(message)}
      />

      {selectedSubject && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setSelectedSubject(null)}
            className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--text-primary)]"
          >
            ← Deneme Analizi
          </button>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="font-semibold text-[var(--text-primary)]">{selectedSubject.name}</span>
          {selectedSubject.examGroup && (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
              {selectedSubject.examGroup}
            </span>
          )}
        </nav>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/15">
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Deneme Analizi</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {selectedSubject
                  ? "Konu bazlı hata performansı"
                  : "Ders bazlı net ortalaması ve başarı oranı"}
              </p>
            </div>
          </div>
          {!selectedSubject && (
            <button
              type="button"
              onClick={() => setAddExamOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all hover:scale-[1.02] hover:shadow-[var(--primary)]/40"
            >
              <Plus className="h-3.5 w-3.5" />
              Deneme Ekle
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Sınav Türü
            </p>
            <FilterButtonGroup
              options={EXAM_TYPE_OPTIONS}
              value={examTypeFilter}
              onChange={setExamTypeFilter}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Kapsam
            </p>
            <FilterButtonGroup
              options={LAST_N_OPTIONS}
              value={lastN}
              onChange={setLastN}
            />
          </div>
        </div>
      </div>

      {selectedSubject ? (
        <ExamTopicDetail
          studentId={studentId}
          subject={selectedSubject}
          filteredExams={filteredExams}
          lastN={lastN}
        />
      ) : (
        <>
          <FocusCard
            recommendations={focusRecommendations}
            lastNLabel={lastNLabel}
            loading={focusLoading}
          />

          {summary && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Deneme", value: summary.examCount },
                { label: "Ders", value: summary.subjectCount },
                {
                  label: "Ort. Net",
                  value: summary.avgNet.toFixed(1),
                },
                { label: "Ort. Başarı", value: `%${summary.avgSuccess}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-14 text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-[var(--text-primary)]/15" />
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Bu kriterlerde deneme yok
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Farklı sınav türü veya deneme aralığı seçmeyi deneyin
              </p>
            </div>
          ) : subjectRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-14 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Seçili denemelerde ders sonucu bulunamadı
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {subjectRows.map((row, idx) => {
                const barColor = row.color ?? "#4F7CFF";
                const barWidth = Math.max(
                  row.successPct,
                  row.successPct > 0 ? 2 : 0
                );

                return (
                  <button
                    key={row.subjectId}
                    type="button"
                    onClick={() => openSubjectDetail(row)}
                    className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 px-4 py-3.5 text-left transition-all duration-300 hover:border-[var(--primary)]/35 hover:shadow-[0_0_20px_rgba(123,47,255,0.12)]"
                    style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span
                            className="h-4 w-1 shrink-0 rounded-full"
                            style={{ background: barColor }}
                          />
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {row.subjectName}
                          </p>
                          {row.examGroup && (
                            <ExamGroupBadge group={row.examGroup} />
                          )}
                        </div>
                        {row.topicCount > 0 && (
                          <p className="mt-0.5 pl-3 text-[11px] text-[var(--text-muted)]">
                            {row.topicCount} konu
                          </p>
                        )}
                      </div>

                      <div className="hidden min-w-0 flex-[1.4] sm:block">
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Net Ortalaması{" "}
                          <span className="font-bold text-[var(--text-primary)]">
                            {row.avgNet.toFixed(1)}
                          </span>
                          <span className="text-[var(--text-muted)]"> / </span>
                          <span className="text-[var(--text-secondary)]">
                            {row.avgTotalQuestions.toFixed(0)}
                          </span>
                        </p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          {row.examCount} deneme ortalaması
                        </p>
                      </div>

                      <SuccessRing
                        pct={row.successPct}
                        color={barColor}
                        ringId={String(row.subjectId)}
                      />

                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--text-muted)] sm:block" />
                    </div>

                    <div className="mt-3 sm:hidden">
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Net Ortalaması{" "}
                        <span className="font-bold text-[var(--text-primary)]">
                          {row.avgNet.toFixed(1)}
                        </span>
                        <span className="text-[var(--text-muted)]"> / </span>
                        <span className="text-[var(--text-secondary)]">
                          {row.avgTotalQuestions.toFixed(0)}
                        </span>
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barWidth}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-center text-[11px] text-[var(--text-muted)]">
            Net ortalamaları {lastNLabel.toLowerCase()} denemeye göre
            hesaplanmıştır.
          </p>
        </>
      )}
    </div>
  );
}
