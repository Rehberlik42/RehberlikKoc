"use client";

import { useState } from "react";
import { ChevronDown, Target } from "lucide-react";
import {
  priorityLevelColor,
  type FocusItem,
  type FocusRecommendations,
} from "./exam-analysis-utils";

interface Props {
  recommendations: FocusRecommendations | null;
  lastNLabel: string;
  loading: boolean;
  studentName?: string | null;
}

export function coachSentence(item: FocusItem): string {
  const { level, trend, hitCount, examsCount } = item.priority;

  if (level === "critical" && trend === "worsening") {
    return `Son ${examsCount} denemenin ${hitCount}'ünde zayıf ve yanlışı artıyor — bu hafta önceliğin bu, buna ağırlık verdir.`;
  }
  if (level === "critical" && trend === "stable") {
    return `${hitCount}/${examsCount} denemede tekrar eden bir eksik. Bu hafta bu konuya çalıştır.`;
  }
  if (level === "critical" && trend === "improving") {
    return "Hâlâ zayıf ama düzeliyor — pekiştirmek için bu hafta üstüne git.";
  }
  if (level === "secondary" && trend === "worsening") {
    return "Yanlışı artmaya başladı, kontrol altına almak için birkaç deneme çözdür.";
  }
  if (level === "secondary" && trend === "improving") {
    return "İyileşiyor — birkaç soruyla pekiştirirse oturacak.";
  }
  if (level === "secondary") {
    return "Ara ara tekrar eden hata. Fırsat buldukça pekiştirin.";
  }
  return "Hafif eksik, takipte kalın.";
}

function FocusItemRow({ item }: { item: FocusItem }) {
  const levelColor = priorityLevelColor(item.priority.level);
  const subjectColor = item.color ?? "#4F7CFF";

  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/80 p-3.5">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: levelColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {item.priority.topicName}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: subjectColor }}
              aria-hidden
            />
            {item.subjectName}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          {coachSentence(item)}
        </p>
      </div>
      <span className="shrink-0 self-start rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
        Son {item.priority.examsCount} denemenin {item.priority.hitCount}&apos;ünde
      </span>
    </div>
  );
}

function FocusSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60"
        />
      ))}
    </div>
  );
}

export default function FocusCard({
  recommendations,
  lastNLabel,
  loading,
  studentName,
}: Props) {
  const [showWeakest, setShowWeakest] = useState(false);

  const subtitle = studentName
    ? `${studentName} için önerilen çalışma önceliği`
    : "Önerilen çalışma önceliği";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
          <Target className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">🎯 Bu Hafta Odak</h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            {lastNLabel} deneme kapsamına göre
          </p>
        </div>
      </div>

      {loading ? (
        <FocusSkeleton />
      ) : !recommendations?.hasData ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          Konu bazlı öneri için yeterli veri yok. Deneme girişlerinde zayıf konuları
          işaretledikçe öneriler oluşur.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {recommendations.top3.map((item) => (
              <FocusItemRow key={`${item.subjectId}-${item.priority.topicId}`} item={item} />
            ))}
          </div>

          {recommendations.subjectWeakest.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3">
              <button
                type="button"
                onClick={() => setShowWeakest((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <span>Ders bazlı en zayıf konular</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${showWeakest ? "rotate-180" : ""}`}
                />
              </button>
              {showWeakest && (
                <div className="mt-2 space-y-2">
                  {recommendations.subjectWeakest.map((item) => (
                    <div
                      key={`weakest-${item.subjectId}`}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: priorityLevelColor(item.priority.level),
                        }}
                        aria-hidden
                      />
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color ?? "#4F7CFF" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-primary)]">
                        <span className="font-semibold">{item.subjectName}</span>
                        <span className="text-[var(--text-muted)]"> · </span>
                        {item.priority.topicName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
