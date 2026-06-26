"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Loader2,
  Minus,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildTopicErrorAnalysis,
  topicSeverityBg,
  topicSeverityColor,
  topicTrendColor,
  type LastNFilter,
  type NormalizedExam,
  type RawTopicErrorRecord,
  type TopicErrorAnalysisRow,
  type TopicTrend,
} from "./exam-analysis-utils";

interface SelectedSubject {
  id: number;
  name: string;
  color: string | null;
  examGroup?: string | null;
}

interface Props {
  studentId: string;
  subject: SelectedSubject;
  filteredExams: NormalizedExam[];
  lastN: LastNFilter;
}

function TrendBadge({ trend }: { trend: TopicTrend }) {
  const color = topicTrendColor(trend);

  if (trend === "improving") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
        style={{ color }}
      >
        <TrendingUp className="h-3 w-3" />
        İyileşiyor
      </span>
    );
  }
  if (trend === "worsening") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
        style={{ color }}
      >
        <TrendingUp className="h-3 w-3" />
        Kötüleşiyor
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
      style={{ color }}
    >
      <Minus className="h-3 w-3" />
      Sabit
    </span>
  );
}

function MiniSparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const w = 48;
  const h = 20;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 opacity-80">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function cellTone(wrong: number): string {
  if (wrong <= 0) return "text-[var(--text-muted)]";
  if (wrong === 1) return "text-yellow-400";
  return "text-red-400";
}

function cellBg(wrong: number): string {
  if (wrong <= 0) return "bg-white/[0.02]";
  if (wrong === 1) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

export default function ExamTopicDetail({
  studentId,
  subject,
  filteredExams,
  lastN,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawErrors, setRawErrors] = useState<RawTopicErrorRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("mock_exam_topic_errors")
        .select(
          `topic_id, wrong_count,
           topic:topics(id, name, order_index),
           result:mock_exam_results!inner(
             id, subject_id, mock_exam_id,
             mock_exam:mock_exams!inner(id, exam_date, student_id)
           )`
        )
        .eq("result.subject_id", subject.id)
        .eq("result.mock_exam.student_id", studentId);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setRawErrors([]);
        setLoading(false);
        return;
      }

      setRawErrors((data ?? []) as RawTopicErrorRecord[]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, subject.id]);

  const analysis = useMemo(
    () => buildTopicErrorAnalysis(rawErrors, filteredExams),
    [rawErrors, filteredExams]
  );

  const subjectColor = subject.color ?? "#4F7CFF";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 px-6 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">Konu analizi yükleniyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/5 px-6 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-2 fill-mode-both space-y-5 duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)]"
            style={{ background: `${subjectColor}22` }}
          >
            <BookOpen className="h-5 w-5" style={{ color: subjectColor }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">{subject.name}</h3>
              {subject.examGroup && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    subject.examGroup === "TYT"
                      ? "border-[var(--primary-2)]/30 bg-[var(--primary-2)]/15 text-[var(--accent)]"
                      : subject.examGroup === "AYT"
                        ? "border-[var(--primary)]/30 bg-[var(--primary)]/15 text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
                  }`}
                >
                  {subject.examGroup}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {subject.name} dersi konu bazlı deneme performansı
            </p>
          </div>
        </div>
      </div>

      {analysis.topicCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Hatalı Konu", value: String(analysis.topicCount) },
            {
              label: "Ort. Yanlış/Deneme",
              value: analysis.avgWrongPerExam.toFixed(1),
            },
            {
              label: "Gelişime Açık",
              value: analysis.worstTopic?.topicName ?? "—",
              small: true,
            },
            {
              label: "En Temiz Konu",
              value: analysis.bestTopic?.topicName ?? "—",
              small: true,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {item.label}
              </p>
              <p
                className={`mt-1 font-black text-[var(--text-primary)] ${
                  item.small ? "text-sm leading-snug" : "text-lg"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {analysis.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-[var(--text-primary)]/15" />
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Bu derste henüz konu bazlı hata verisi yok.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Deneme girişinde zayıf konuları işaretleyince burada analiz görünür.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            {analysis.topicCount} konuda hata tespit edildi
            {lastN !== "all" ? ` (son ${lastN} deneme)` : ""}
          </p>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="sticky left-0 z-10 min-w-[9rem] bg-[var(--surface)] px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Konu
                  </th>
                  {analysis.examColumns.map((col) => (
                    <th
                      key={col.mockExamId}
                      className="min-w-[4.5rem] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      <span className="block truncate">{col.label}</span>
                      <span className="mt-0.5 block font-normal normal-case text-[var(--text-muted)]">
                        {col.shortDate}
                      </span>
                    </th>
                  ))}
                  <th className="min-w-[4rem] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Ort.
                  </th>
                  <th className="min-w-[5rem] px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.rows.map((row) => (
                  <TopicTableRow
                    key={row.topicId}
                    row={row}
                    examColumns={analysis.examColumns}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Yeşil: az hata (≤0.5 ort.)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Sarı: orta (0.5–1.5)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Kırmızı: sık/çok hata (&gt;1.5)
        </span>
      </div>
    </div>
  );
}

function TopicTableRow({
  row,
  examColumns,
}: {
  row: TopicErrorAnalysisRow;
  examColumns: { mockExamId: number }[];
}) {
  const severityColor = topicSeverityColor(row.severity);
  const trendColor = topicTrendColor(row.trend);

  return (
    <tr
      className="border-b border-[var(--border)] last:border-0"
      style={{ background: topicSeverityBg(row.severity) }}
    >
      <td className="sticky left-0 z-10 bg-inherit px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-1 shrink-0 rounded-full"
            style={{ background: severityColor }}
          />
          <span className="font-semibold text-[var(--text-primary)]">{row.topicName}</span>
        </div>
        <p className="mt-0.5 pl-3 text-[10px] text-[var(--text-muted)]">
          ort. {row.avgWrong.toFixed(1)} yanlış
        </p>
      </td>
      {examColumns.map((col) => {
        const wrong = row.wrongByExamId[col.mockExamId] ?? 0;
        return (
          <td key={col.mockExamId} className="px-2 py-3 text-center">
            <span
              className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${cellTone(wrong)} ${cellBg(wrong)}`}
            >
              {wrong > 0 ? wrong : "—"}
            </span>
          </td>
        );
      })}
      <td className="px-3 py-3 text-center">
        <span
          className="text-sm font-black tabular-nums"
          style={{ color: severityColor }}
        >
          {row.avgWrong.toFixed(1)}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-center gap-1">
          <TrendBadge trend={row.trend} />
          <MiniSparkline
            values={row.wrongsChronological}
            color={trendColor}
          />
        </div>
      </td>
    </tr>
  );
}
