"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildNetTopicInsight,
  buildTopicErrorAnalysis,
  computeSubjectNetTrend,
  topicSeverityBg,
  topicSeverityColor,
  topicTrendColor,
  topicErrorCellBg,
  topicErrorCellTone,
  type LastNFilter,
  type NetTrendDirection,
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
  width = 48,
  height = 20,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.5);
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0 opacity-80">
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

function netTrendColor(direction: NetTrendDirection): string {
  switch (direction) {
    case "up":
      return "#22c55e";
    case "down":
      return "#ef4444";
    case "flat":
      return "#9ca3af";
  }
}

function netTrendLabel(direction: NetTrendDirection): string {
  switch (direction) {
    case "up":
      return "Yükseliyor";
    case "down":
      return "Düşüyor";
    case "flat":
      return "Sabit";
  }
}

function NetTrendSection({
  netTrend,
}: {
  netTrend: ReturnType<typeof computeSubjectNetTrend>;
}) {
  const trendColor = netTrendColor(netTrend.direction);
  const deltaPrefix = netTrend.delta > 0 ? "+" : "";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Ders Net Trendi
      </p>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-muted)]">
            Net Ortalaması{" "}
            <span className="font-bold text-[var(--text-primary)]">
              {netTrend.avgNet.toFixed(2)}
            </span>
          </p>
          <p className="mt-1 text-lg font-black tabular-nums text-[var(--text-primary)]">
            {netTrend.firstNet.toFixed(2)}
            <span className="mx-2 text-[var(--text-muted)]">→</span>
            {netTrend.lastNet.toFixed(2)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: trendColor }}
            >
              {deltaPrefix}
              {netTrend.delta.toFixed(2)}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: trendColor,
                borderColor: `${trendColor}44`,
                backgroundColor: `${trendColor}14`,
              }}
            >
              {netTrend.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {netTrend.direction === "down" && (
                <TrendingDown className="h-3 w-3" />
              )}
              {netTrend.direction === "flat" && <Minus className="h-3 w-3" />}
              {netTrendLabel(netTrend.direction)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MiniSparkline
            values={netTrend.netSeries}
            color={trendColor}
            width={96}
            height={36}
          />
          <p className="text-[10px] text-[var(--text-muted)]">
            {netTrend.examCount} deneme
          </p>
        </div>
      </div>
    </div>
  );
}

function NetTopicInsightCard({
  insight,
}: {
  insight: ReturnType<typeof buildNetTopicInsight>;
}) {
  const showContributors = insight.contributors.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/80 p-4">
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {insight.headline}
      </p>
      {showContributors && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Katkı veren konular
          </p>
          <ul className="mt-2 space-y-2">
            {insight.contributors.map((row) => (
              <li
                key={row.topicId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-3 py-2"
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {row.topicName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    ort. {row.avgWrong.toFixed(1)} yanlış
                  </span>
                  <TrendBadge trend={row.trend} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
          `topic_id, wrong_count, correct_count, empty_count, not_in_exam,
           topic:topics(id, name, order_index),
           result:mock_exam_results!inner(
             id, subject_id, mock_exam_id,
             mock_exam:mock_exams!inner(id, exam_date, student_id, wrong_penalty_divisor)
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

  const netTrend = useMemo(
    () => computeSubjectNetTrend(filteredExams, subject.id),
    [filteredExams, subject.id]
  );

  const netTopicInsight = useMemo(
    () => buildNetTopicInsight(netTrend, analysis.rows),
    [netTrend, analysis.rows]
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

      {netTrend.examCount >= 2 && (
        <div className="space-y-3">
          <NetTrendSection netTrend={netTrend} />
          <NetTopicInsightCard insight={netTopicInsight} />
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
                {analysis.rows
                  .filter((r) => r.appearedExamCount > 0)
                  .map((row) => (
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
          ort. {row.avgWrong.toFixed(1)} yanlış{" "}
          <span className="text-[var(--text-muted)]/70">
            ({row.appearedExamCount}/{examColumns.length} denemede çıktı)
          </span>
        </p>
        {row.avgNet !== null && (
          <p
            className={`pl-3 text-[10px] font-semibold ${
              row.avgNet >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            net ort. {row.avgNet.toFixed(2)}
          </p>
        )}
      </td>
      {examColumns.map((col) => {
        const wrongRaw = row.wrongByExamId[col.mockExamId];
        const appeared = wrongRaw !== null;
        const wrong = wrongRaw ?? 0;
        return (
          <td key={col.mockExamId} className="px-2 py-3 text-center">
            {appeared ? (
              <span
                className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-bold tabular-nums ${topicErrorCellTone(wrong)} ${topicErrorCellBg(wrong)}`}
              >
                {wrong > 0 ? wrong : "—"}
              </span>
            ) : (
              <span
                title="Bu denemede çıkmadı"
                className="inline-flex min-w-[2rem] justify-center rounded-lg bg-transparent px-2 py-1 text-xs font-bold tabular-nums text-[var(--text-muted)] opacity-40"
              >
                —
              </span>
            )}
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
