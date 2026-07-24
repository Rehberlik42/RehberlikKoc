"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  FileQuestion,
  Layers,
  X,
} from "lucide-react";

// ─── Shared task shape (compatible with TeacherWeeklyPlan PlanTask) ───────────

export type SummaryPlanTask = {
  plan_date: string;
  task_type: string;
  title?: string;
  start_time: string | null;
  end_time: string | null;
  subject: { name: string } | null;
  details: Record<string, string | number> | null;
  solved_count?: number | null;
};

export type DensityTone = "neutral" | "green" | "amber" | "rose";

const DAY_LABELS_FULL = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

function calcDurationMinutes(start: string, end: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return null;
  return endMin - startMin;
}

export function getTaskDurationMinutes(task: SummaryPlanTask): number {
  if (task.start_time && task.end_time) {
    return calcDurationMinutes(task.start_time, task.end_time) ?? 0;
  }
  const est = task.details?.estimated_duration_minutes;
  if (typeof est === "number" && Number.isFinite(est)) return Math.max(0, est);
  if (typeof est === "string" && est.trim() !== "") {
    const n = Number(est);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

export function densityTone(
  totalMinutes: number,
  targetMinutes: number
): DensityTone {
  const ratio = totalMinutes / targetMinutes;
  if (ratio < 0.7) return "neutral";
  if (ratio <= 1) return "green";
  if (ratio <= 1.3) return "amber";
  return "rose";
}

export const DENSITY_BADGE_CLS: Record<DensityTone, string> = {
  neutral:
    "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
  green: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  rose: "border-rose-500/30 bg-rose-500/15 text-rose-300",
};

export const DENSITY_LABEL: Record<DensityTone, string> = {
  neutral: "rahat",
  green: "dengeli",
  amber: "yoğun",
  rose: "aşırı",
};

const DENSITY_BAR_CLS: Record<DensityTone, string> = {
  neutral: "bg-[var(--text-muted)]/40",
  green: "bg-emerald-400/80",
  amber: "bg-amber-400/80",
  rose: "bg-rose-400/80",
};

function getTaskQuestionCount(task: SummaryPlanTask): number {
  if (typeof task.solved_count === "number" && Number.isFinite(task.solved_count)) {
    return Math.max(0, task.solved_count);
  }
  const planned = task.details?.planned_question_count;
  if (typeof planned === "number" && Number.isFinite(planned)) {
    return Math.max(0, planned);
  }
  if (typeof planned === "string" && planned.trim() !== "") {
    const n = Number(planned);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  return 0;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function joinTurkish(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ve ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`;
}

export type DersDagilimItem = {
  name: string;
  count: number;
  ratio: number;
};

export type GunlukDagilimItem = {
  dateStr: string;
  dayLabel: string;
  taskCount: number;
  totalMinutes: number;
  tone: DensityTone | null;
  ratio: number | null;
};

export type WeeklySummary = {
  toplamGorev: number;
  toplamSureDk: number;
  toplamSoru: number;
  dersDagilimi: DersDagilimItem[];
  denemeSayisi: number;
  tekrarSayisi: number;
  gunlukDagilim: GunlukDagilimItem[];
  asiriGunler: string[];
};

export function computeWeeklySummary(
  tasks: SummaryPlanTask[],
  weekStart: Date,
  dailyTargetMinutes: number | null
): WeeklySummary {
  const toplamGorev = tasks.length;
  const toplamSureDk = tasks.reduce(
    (sum, t) => sum + getTaskDurationMinutes(t),
    0
  );
  const toplamSoru = tasks.reduce((sum, t) => sum + getTaskQuestionCount(t), 0);

  const bySubject = new Map<string, number>();
  for (const t of tasks) {
    const name = t.subject?.name?.trim() || "Ders atanmamış";
    bySubject.set(name, (bySubject.get(name) ?? 0) + 1);
  }
  const dersDagilimi: DersDagilimItem[] = [...bySubject.entries()]
    .map(([name, count]) => ({
      name,
      count,
      ratio: toplamGorev > 0 ? count / toplamGorev : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));

  const denemeSayisi = tasks.filter(
    (t) => t.task_type === "deneme" || t.task_type === "bras_deneme"
  ).length;
  const tekrarSayisi = tasks.filter((t) => t.task_type === "tekrar").length;

  const byDate = new Map<string, SummaryPlanTask[]>();
  for (const t of tasks) {
    const list = byDate.get(t.plan_date) ?? [];
    list.push(t);
    byDate.set(t.plan_date, list);
  }

  const gunlukDagilim: GunlukDagilimItem[] = [];
  const asiriGunler: string[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dateStr = toISODate(day);
    const dayTasks = byDate.get(dateStr) ?? [];
    const totalMinutes = dayTasks.reduce(
      (sum, t) => sum + getTaskDurationMinutes(t),
      0
    );
    const hasTarget =
      dailyTargetMinutes != null && dailyTargetMinutes > 0;
    const tone = hasTarget
      ? densityTone(totalMinutes, dailyTargetMinutes)
      : null;
    const ratio = hasTarget ? totalMinutes / dailyTargetMinutes : null;
    const dayLabel = DAY_LABELS_FULL[i];

    gunlukDagilim.push({
      dateStr,
      dayLabel,
      taskCount: dayTasks.length,
      totalMinutes,
      tone,
      ratio,
    });

    if (tone === "rose") asiriGunler.push(dayLabel);
  }

  return {
    toplamGorev,
    toplamSureDk,
    toplamSoru,
    dersDagilimi,
    denemeSayisi,
    tekrarSayisi,
    gunlukDagilim,
    asiriGunler,
  };
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
}

export default function WeeklyProgramSummaryModal({
  open,
  onClose,
  tasks,
  weekStart,
  weekRangeLabel,
  dailyTargetMinutes,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    () => computeWeeklySummary(tasks, weekStart, dailyTargetMinutes),
    [tasks, weekStart, dailyTargetMinutes]
  );

  const maxDayMinutes = useMemo(() => {
    const peak = Math.max(
      ...summary.gunlukDagilim.map((d) => d.totalMinutes),
      dailyTargetMinutes ?? 0,
      1
    );
    return peak;
  }, [summary.gunlukDagilim, dailyTargetMinutes]);

  if (!mounted || !open) return null;

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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
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
                  {dailyTargetMinutes != null && dailyTargetMinutes > 0
                    ? ` · Günlük hedef ${dailyTargetMinutes} dk`
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
                    maxDayMinutes > 0
                      ? Math.round((day.totalMinutes / maxDayMinutes) * 100)
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
                            height: `${Math.max(day.totalMinutes > 0 ? 8 : 2, barPct)}%`,
                          }}
                          title={`${day.totalMinutes} dk · ${day.taskCount} görev`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
                        {day.totalMinutes}
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
