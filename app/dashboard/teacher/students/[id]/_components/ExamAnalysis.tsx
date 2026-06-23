"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import {
  computeSubjectAnalysis,
  filterExamsForAnalysis,
  type ExamTypeFilter,
  type LastNFilter,
  type NormalizedExam,
} from "./exam-analysis-utils";

interface Props {
  exams: { id: number; name: string }[];
  analysisExams: NormalizedExam[];
  topicCountBySubjectId: Record<number, number>;
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
        <span className="text-[11px] font-black tabular-nums text-white">
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
    <div className="flex flex-wrap gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "bg-[#7B2FFF]/20 text-white shadow-[0_0_12px_rgba(123,47,255,0.2)]"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExamAnalysis({
  exams,
  analysisExams,
  topicCountBySubjectId,
}: Props) {
  const [examTypeFilter, setExamTypeFilter] = useState<ExamTypeFilter>("TYT+AYT");
  const [lastN, setLastN] = useState<LastNFilter>(5);

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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/8 bg-[#0d0d2b]/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B2FFF]/25 bg-[#7B2FFF]/15">
              <BarChart3 className="h-4 w-4 text-[#A78BFF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Deneme Analizi</h3>
              <p className="text-[11px] text-white/35">
                Ders bazlı net ortalaması ve başarı oranı
              </p>
            </div>
          </div>
          {exams.length > 0 && (
            <p className="text-[10px] text-white/30">
              {exams.length} sınav türü kayıtlı
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Sınav Türü
            </p>
            <FilterButtonGroup
              options={EXAM_TYPE_OPTIONS}
              value={examTypeFilter}
              onChange={setExamTypeFilter}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
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
              className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0d2b]/40 px-6 py-14 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-white/15" />
          <p className="mt-4 text-sm text-white/40">
            Bu kriterlerde deneme yok
          </p>
          <p className="mt-1 text-xs text-white/25">
            Farklı sınav türü veya deneme aralığı seçmeyi deneyin
          </p>
        </div>
      ) : subjectRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0d2b]/40 px-6 py-14 text-center">
          <p className="text-sm text-white/40">
            Seçili denemelerde ders sonucu bulunamadı
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjectRows.map((row, idx) => {
            const barColor = row.color ?? "#4F7CFF";
            const barWidth = Math.max(row.successPct, row.successPct > 0 ? 2 : 0);

            return (
              <div
                key={row.subjectId}
                className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both rounded-2xl border border-white/8 bg-[#0d0d2b]/60 px-4 py-3.5 duration-300"
                style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-1 shrink-0 rounded-full"
                        style={{ background: barColor }}
                      />
                      <p className="truncate text-sm font-semibold text-white">
                        {row.subjectName}
                      </p>
                    </div>
                    {row.topicCount > 0 && (
                      <p className="mt-0.5 pl-3 text-[11px] text-white/35">
                        {row.topicCount} konu
                      </p>
                    )}
                  </div>

                  <div className="hidden min-w-0 flex-[1.4] sm:block">
                    <p className="text-[11px] text-white/45">
                      Net Ortalaması{" "}
                      <span className="font-bold text-white">
                        {row.avgNet.toFixed(1)}
                      </span>
                      <span className="text-white/25"> / </span>
                      <span className="text-white/60">
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
                    <p className="mt-1 text-[10px] text-white/30">
                      {row.examCount} deneme ortalaması
                    </p>
                  </div>

                  <SuccessRing
                    pct={row.successPct}
                    color={barColor}
                    ringId={String(row.subjectId)}
                  />

                  <ChevronRight
                    className="hidden h-4 w-4 shrink-0 text-white/15 sm:block"
                    aria-hidden
                  />
                </div>

                <div className="mt-3 sm:hidden">
                  <p className="text-[11px] text-white/45">
                    Net Ortalaması{" "}
                    <span className="font-bold text-white">
                      {row.avgNet.toFixed(1)}
                    </span>
                    <span className="text-white/25"> / </span>
                    <span className="text-white/60">
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
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] text-white/25">
        Net ortalamaları {lastNLabel.toLowerCase()} denemeye göre hesaplanmıştır.
      </p>
    </div>
  );
}
