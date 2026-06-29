"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronRight } from "lucide-react";
import StudentTopicDetail from "./StudentTopicDetail";
import {
  computeSubjectAnalysis,
  type NormalizedExam,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

interface SelectedSubject {
  id: number;
  name: string;
  color: string | null;
  examGroup: string | null;
}

interface Props {
  studentId: string;
  analysisExams: NormalizedExam[];
}

function SuccessRing({
  pct,
  color,
  ringId,
  size = 48,
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
  const gradId = `studentExamRing-${ringId}`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
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
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.55" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black tabular-nums text-[var(--text-primary)]">
          %{pct}
        </span>
      </div>
    </div>
  );
}

export default function StudentExamAnalysis({ studentId, analysisExams }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<SelectedSubject | null>(null);

  const subjectRows = useMemo(
    () => computeSubjectAnalysis(analysisExams, {}),
    [analysisExams]
  );

  if (analysisExams.length === 0) {
    return (
      <div className="pdf-export-hide print-hidden rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-12 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Henüz yeterli deneme yok, deneme ekledikçe ders analizin burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="pdf-export-hide print-hidden space-y-4">
      {selectedSubject && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setSelectedSubject(null)}
            className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--text-primary)]"
          >
            ← Derslerim
          </button>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {selectedSubject.name}
          </span>
        </nav>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
            <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">📊 Derslerim</h3>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Son denemelerine göre ders ders durumun
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Son 5 deneme</p>
          </div>
        </div>

        {selectedSubject ? (
          <StudentTopicDetail
            studentId={studentId}
            subject={selectedSubject}
            filteredExams={analysisExams}
          />
        ) : subjectRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            Seçili denemelerde ders sonucu bulunamadı.
          </p>
        ) : (
          <div className="space-y-2">
            {subjectRows.map((row) => {
              const barColor = row.color ?? "#4F7CFF";
              const barWidth = Math.max(row.successPct, row.successPct > 0 ? 2 : 0);

              return (
                <button
                  key={row.subjectId}
                  type="button"
                  onClick={() =>
                    setSelectedSubject({
                      id: row.subjectId,
                      name: row.subjectName,
                      color: row.color,
                      examGroup: row.examGroup,
                    })
                  }
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3.5 text-left transition-all hover:border-[var(--primary)]/35 hover:shadow-[0_0_16px_rgba(123,47,255,0.1)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-1 shrink-0 rounded-full"
                          style={{ background: barColor }}
                        />
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {row.subjectName}
                        </p>
                      </div>
                      <p className="mt-1 pl-3 text-[11px] text-[var(--text-muted)]">
                        Net ort.{" "}
                        <span className="font-bold text-[var(--text-primary)]">
                          {row.avgNet.toFixed(1)}
                        </span>
                        <span className="text-[var(--text-muted)]"> / </span>
                        {row.avgTotalQuestions.toFixed(0)} soru
                      </p>
                      <div className="mt-2 pl-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barWidth}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    </div>
                    <SuccessRing
                      pct={row.successPct}
                      color={barColor}
                      ringId={String(row.subjectId)}
                    />
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
