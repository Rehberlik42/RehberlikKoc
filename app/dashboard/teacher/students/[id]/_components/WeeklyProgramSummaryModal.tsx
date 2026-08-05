"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  FileQuestion,
  Layers,
  X,
} from "lucide-react";
import {
  DENSITY_BADGE_CLS,
  DENSITY_LABEL,
  computeWeeklySummary,
  type DensityTone,
  type SummaryPlanTask,
} from "@/lib/weekly-program-summary";

export type {
  DensityTone,
  DersDagilimItem,
  GunlukDagilimItem,
  SummaryPlanTask,
  WeeklySummary,
} from "@/lib/weekly-program-summary";

export {
  DENSITY_BADGE_CLS,
  DENSITY_LABEL,
  computeWeeklySummary,
  densityTone,
  getTaskDurationMinutes,
} from "@/lib/weekly-program-summary";

const DENSITY_BAR_CLS: Record<DensityTone, string> = {
  neutral: "bg-[var(--text-muted)]/40",
  green: "bg-emerald-400/80",
  amber: "bg-amber-400/80",
  rose: "bg-rose-400/80",
};

function joinTurkish(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ve ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: SummaryPlanTask[];
  weekStart: Date;
  weekRangeLabel: string;
  dailyTargetMinutes: number | null;
  dailyTargetTasks?: number | null;
  dailyTargetUnit?: "task" | "minute";
}

export default function WeeklyProgramSummaryModal({
  open,
  onClose,
  tasks,
  weekStart,
  weekRangeLabel,
  dailyTargetMinutes,
  dailyTargetTasks = null,
  dailyTargetUnit = "minute",
}: Props) {
  const canPortal = typeof document !== "undefined";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  const summary = useMemo(
    () =>
      computeWeeklySummary(tasks, weekStart, dailyTargetMinutes, {
        unit: dailyTargetUnit,
        dailyTargetTasks,
      }),
    [tasks, weekStart, dailyTargetMinutes, dailyTargetUnit, dailyTargetTasks]
  );

  const maxDayLoad = useMemo(() => {
    const peak = Math.max(
      ...summary.gunlukDagilim.map((d) => d.loadValue),
      summary.targetValue ?? 0,
      1
    );
    return peak;
  }, [summary.gunlukDagilim, summary.targetValue]);

  if (!canPortal || !open) return null;

  const overloadWarning =
    summary.asiriGunler.length > 0
      ? `${joinTurkish(summary.asiriGunler)} hedefin üzerinde, dengelemek ister misiniz?`
      : null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/50"
      />

      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-summary-title"
          className="relative my-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
                <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h2
                  id="weekly-summary-title"
                  className="text-base font-bold text-[var(--text-primary)]"
                >
                  Program Özeti
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {weekRangeLabel}
                  {summary.targetValue != null
                    ? ` · Günlük hedef ${
                        summary.targetUnit === "task"
                          ? `${summary.targetValue} görev`
                          : `${summary.targetValue} dk`
                      }`
                    : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {overloadWarning && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                <p className="text-xs leading-relaxed text-rose-100/90">
                  {overloadWarning}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatCard
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Toplam Görev"
                value={String(summary.toplamGorev)}
              />
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Toplam Süre"
                value={formatMinutes(summary.toplamSureDk)}
              />
              <StatCard
                icon={<FileQuestion className="h-3.5 w-3.5" />}
                label="Toplam Soru"
                value={String(summary.toplamSoru)}
              />
              <StatCard
                icon={<ClipboardList className="h-3.5 w-3.5" />}
                label="Deneme"
                value={String(summary.denemeSayisi)}
                hint={
                  summary.tekrarSayisi > 0
                    ? `${summary.tekrarSayisi} tekrar`
                    : undefined
                }
              />
            </div>

            <section>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Derslere göre dağılım
              </h3>
              {summary.dersDagilimi.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Bu hafta henüz görev yok.
                </p>
              ) : (
                <ul className="space-y-2">
                  {summary.dersDagilimi.map((item) => (
                    <li key={item.name}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
                          {item.count} görev · {Math.round(item.ratio * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]/70"
                          style={{
                            width: `${Math.max(4, Math.round(item.ratio * 100))}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Günlük yoğunluk dengesi
              </h3>
              <div className="grid grid-cols-7 gap-1.5">
                {summary.gunlukDagilim.map((day) => {
                  const barPct =
                    maxDayLoad > 0
                      ? Math.round((day.loadValue / maxDayLoad) * 100)
                      : 0;
                  const tone = day.tone;
                  return (
                    <div
                      key={day.dateStr}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white/[0.02] px-1 py-2"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        {day.dayLabel.slice(0, 3)}
                      </span>
                      <div className="flex h-16 w-full items-end justify-center px-1">
                        <div
                          className={`w-full max-w-[1.25rem] rounded-t-md ${
                            tone
                              ? DENSITY_BAR_CLS[tone]
                              : "bg-[var(--primary)]/50"
                          }`}
                          style={{
                            height: `${Math.max(day.loadValue > 0 ? 8 : 2, barPct)}%`,
                          }}
                          title={`${day.taskCount} görev · ${day.totalMinutes} dk`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
                        {summary.targetUnit === "task"
                          ? day.taskCount
                          : day.totalMinutes}
                      </span>
                      {tone ? (
                        <span
                          className={`rounded-full border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider ${DENSITY_BADGE_CLS[tone]}`}
                        >
                          {DENSITY_LABEL[tone]}
                        </span>
                      ) : (
                        <span className="h-[18px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="flex shrink-0 justify-end border-t border-[var(--border)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[var(--accent)]">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
