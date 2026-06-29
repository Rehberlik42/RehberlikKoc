"use client";

import { useMemo } from "react";
import { Minus, Target, TrendingDown, TrendingUp } from "lucide-react";
import {
  computeOverallTargetProgress,
  computeTargetProgress,
  examGroupFromName,
  targetStatusColor,
  type NetTrendDirection,
  type TargetProgress,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";
import type { SubjectOption } from "./MockExamsClient";

interface ExistingTarget {
  target_net: number;
}

interface Props {
  subjects: SubjectOption[];
  existingTargets: Record<number, ExistingTarget>;
  currentNets: Record<number, number>;
  netSeriesBySubjectId: Record<number, number[]>;
}

const GROUP_ORDER = ["TYT", "AYT", "LGS", "Diğer"] as const;

function groupLabel(group: string): string {
  if (group === "TYT") return "TYT";
  if (group === "AYT") return "AYT";
  if (group === "LGS") return "LGS";
  return "Diğer";
}

function TrendArrow({ direction }: { direction: NetTrendDirection }) {
  if (direction === "up") {
    return <TrendingUp className="h-3.5 w-3.5 text-green-500" aria-hidden />;
  }
  if (direction === "down") {
    return <TrendingDown className="h-3.5 w-3.5 text-orange-500" aria-hidden />;
  }
  return <Minus className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden />;
}

function studentStatusMessage(
  progress: TargetProgress,
  subjectName: string
): string {
  if (progress.reached) {
    return "Bu derste hedefine ulaştın, harikasın! 🎯";
  }
  const rem = progress.remaining != null ? progress.remaining.toFixed(1) : "0";
  switch (progress.status) {
    case "approaching":
      return `${rem} net kaldı ve yükseliyorsun — devam et, çok yakınsın! 💪`;
    case "drifting":
      return `${rem} net var ama son denemelerde düşüş var. Bu derse biraz daha yüklen.`;
    case "stalled":
      return `${rem} net kaldı, son zamanlarda sabit. Küçük bir ivme ile hedefe ulaşırsın.`;
    default:
      return `${subjectName} hedefin için çalışmaya devam et.`;
  }
}

function SubjectTargetRow({
  subjectName,
  barColor,
  progress,
}: {
  subjectName: string;
  barColor: string;
  progress: TargetProgress;
}) {
  const statusColor = targetStatusColor(progress.status);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: barColor }} />
        <p className="text-sm font-semibold text-[var(--text-primary)]">{subjectName}</p>
      </div>

      <p className="mt-2 pl-3 text-xs text-[var(--text-secondary)]">
        Hedef{" "}
        <span className="font-bold tabular-nums text-[var(--text-primary)]">
          {progress.targetNet!.toFixed(1)}
        </span>
        {progress.hasCurrent ? (
          <>
            {" "}
            · Şu an{" "}
            <span className="font-bold tabular-nums text-[var(--text-primary)]">
              {progress.currentNet!.toFixed(1)}
            </span>
            {progress.reached ? (
              <span className="font-semibold text-green-500"> · Hedefe ulaştın ✓</span>
            ) : progress.remaining != null ? (
              <span className="font-semibold tabular-nums">
                {" "}
                · {progress.remaining.toFixed(1)} net kaldı
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-[var(--text-muted)]"> · Henüz deneme verisi yok</span>
        )}
      </p>

      <div
        className="mt-2.5 flex items-start gap-2 rounded-lg border px-3 py-2 pl-3"
        style={{
          borderColor: `${statusColor}33`,
          backgroundColor: `${statusColor}0d`,
        }}
      >
        <TrendArrow direction={progress.trendDirection} />
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {studentStatusMessage(progress, subjectName)}
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8 pl-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.reached
              ? "bg-green-500"
              : "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
          }`}
          style={{ width: `${Math.max(progress.fillPct, progress.fillPct > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentTargets({
  subjects,
  existingTargets,
  currentNets,
  netSeriesBySubjectId,
}: Props) {
  const targetSubjectIds = useMemo(
    () => new Set(Object.keys(existingTargets).map(Number)),
    [existingTargets]
  );

  const progressItems = useMemo(() => {
    const items: TargetProgress[] = [];
    for (const subjectId of targetSubjectIds) {
      const target = existingTargets[subjectId];
      if (!target) continue;
      items.push(
        computeTargetProgress({
          subjectId,
          currentNet: currentNets[subjectId] ?? null,
          targetNet: target.target_net,
          netSeries: netSeriesBySubjectId[subjectId],
        })
      );
    }
    return items;
  }, [targetSubjectIds, existingTargets, currentNets, netSeriesBySubjectId]);

  const overall = useMemo(
    () => computeOverallTargetProgress(progressItems),
    [progressItems]
  );

  const groupedSubjects = useMemo(() => {
    const withTargets = subjects.filter((s) => targetSubjectIds.has(s.id));
    const groups = new Map<string, SubjectOption[]>();

    for (const subject of withTargets) {
      const examName = subject.exam?.name ?? "";
      const group = examGroupFromName(examName) ?? "Diğer";
      const list = groups.get(group) ?? [];
      list.push(subject);
      groups.set(group, list);
    }

    return GROUP_ORDER.filter((g) => groups.has(g)).map((group) => ({
      group,
      subjects: (groups.get(group) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "tr-TR")
      ),
    }));
  }, [subjects, targetSubjectIds]);

  const progressBySubjectId = useMemo(
    () => new Map(progressItems.map((p) => [p.subjectId, p])),
    [progressItems]
  );

  if (overall.targetCount === 0) {
    return (
      <div className="pdf-export-hide print-hidden rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
        <Target className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Koçun henüz hedef belirlemedi. Hedeflerin burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="pdf-export-hide print-hidden space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
          <Target className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Hedeflerim</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Koçunun belirlediği ders hedeflerin ve ilerlemen.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--text-primary)]">
            {overall.reachedCount}/{overall.targetCount}
          </span>{" "}
          derste hedefindesin
          {overall.overallRemaining > 0 ? (
            <>
              , toplam{" "}
              <span className="font-semibold tabular-nums">
                {overall.overallRemaining.toFixed(1)} net kaldı
              </span>
            </>
          ) : (
            <span className="font-semibold text-green-500"> — tüm hedeflerde başarılısın!</span>
          )}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] transition-all duration-300"
            style={{
              width: `${Math.max(overall.overallFillPct, overall.overallFillPct > 0 ? 2 : 0)}%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {groupedSubjects.map(({ group, subjects: groupSubjects }) => (
          <div key={group}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {groupLabel(group)}
            </p>
            <div className="space-y-2">
              {groupSubjects.map((subject) => {
                const progress = progressBySubjectId.get(subject.id);
                if (!progress) return null;
                return (
                  <SubjectTargetRow
                    key={subject.id}
                    subjectName={subject.name}
                    barColor={subject.color ?? "#4F7CFF"}
                    progress={progress}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
