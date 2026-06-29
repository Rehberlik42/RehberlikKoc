import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type {
  NetTrendDirection,
  OverallTargetProgress,
  TargetProgressStatus,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

export interface TargetHighlight {
  subjectName: string;
  remaining: number | null;
  reached: boolean;
  status: TargetProgressStatus;
  trendDirection: NetTrendDirection;
}

interface Props {
  overall: OverallTargetProgress;
  highlights: TargetHighlight[];
}

function TrendGlyph({ direction }: { direction: NetTrendDirection }) {
  if (direction === "up") {
    return <TrendingUp className="h-3 w-3 text-green-500" aria-hidden />;
  }
  if (direction === "down") {
    return <TrendingDown className="h-3 w-3 text-orange-500" aria-hidden />;
  }
  return <Minus className="h-3 w-3 text-[var(--text-muted)]" aria-hidden />;
}

function highlightSentence(h: TargetHighlight): string {
  if (h.reached) {
    return `${h.subjectName}'de hedefindesin! 🎯`;
  }
  const rem = h.remaining != null ? h.remaining.toFixed(1) : "0";
  if (h.status === "approaching") {
    return `${h.subjectName}'e ${rem} net kaldı, yaklaşıyorsun`;
  }
  if (h.status === "drifting") {
    return `${h.subjectName}'te ${rem} net kaldı ama düşüş var`;
  }
  if (h.status === "stalled") {
    return `${h.subjectName}'te ${rem} net kaldı — küçük bir ivme yeter`;
  }
  return `${h.subjectName}'e ${rem} net kaldı`;
}

export default function TargetSummaryCard({ overall, highlights }: Props) {
  if (overall.targetCount === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)]/80 to-[var(--primary)]/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">🎯 Hedeflerim</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {overall.reachedCount}/{overall.targetCount}
            </span>{" "}
            derste hedefindesin
            {overall.overallRemaining > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="tabular-nums">
                  {overall.overallRemaining.toFixed(1)} net kaldı
                </span>
              </>
            ) : (
              <span className="text-green-500"> · Tüm hedeflerde başarılısın!</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/student/mock-exams"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent)]"
        >
          Tümünü gör
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] transition-all duration-300"
          style={{
            width: `${Math.max(overall.overallFillPct, overall.overallFillPct > 0 ? 2 : 0)}%`,
          }}
        />
      </div>

      {highlights.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {highlights.map((h) => (
            <li
              key={h.subjectName}
              className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]"
            >
              <TrendGlyph direction={h.trendDirection} />
              <span>{highlightSentence(h)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
