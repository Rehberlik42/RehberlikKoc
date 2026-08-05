/**
 * Haftalık program özeti — UI (WeeklyProgramSummaryModal) ve DORA bağlamı
 * aynı mantığı paylaşır.
 */

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

export type DailyTargetUnit = "task" | "minute";

export type DailyTargetConfig = {
  unit: DailyTargetUnit;
  minutes: number | null;
  tasks: number | null;
};

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

/** value / target — birim bağımsız eşikler (%70 / %100 / %130). */
export function densityTone(value: number, target: number): DensityTone {
  const ratio = value / target;
  if (ratio < 0.7) return "neutral";
  if (ratio <= 1) return "green";
  if (ratio <= 1.3) return "amber";
  return "rose";
}

/** Aktif birime göre hedef sayı; yoksa null. */
export function resolveDailyTarget(config: DailyTargetConfig): number | null {
  if (config.unit === "task") {
    return config.tasks != null && config.tasks > 0 ? config.tasks : null;
  }
  return config.minutes != null && config.minutes > 0 ? config.minutes : null;
}

/** Günün yük değeri — birime göre görev sayısı veya dakika toplamı. */
export function dayLoadValue(
  dayTasks: SummaryPlanTask[],
  unit: DailyTargetUnit
): number {
  if (unit === "task") return dayTasks.length;
  return dayTasks.reduce((sum, t) => sum + getTaskDurationMinutes(t), 0);
}

export function formatDailyTargetLabel(config: DailyTargetConfig): string {
  const target = resolveDailyTarget(config);
  if (target == null) return "tanımsız";
  return config.unit === "task" ? `${target} görev` : `${target} dk`;
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

function getTaskQuestionCount(task: SummaryPlanTask): number {
  if (
    typeof task.solved_count === "number" &&
    Number.isFinite(task.solved_count)
  ) {
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
  loadValue: number;
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
  targetUnit: DailyTargetUnit;
  targetValue: number | null;
};

export function computeWeeklySummary(
  tasks: SummaryPlanTask[],
  weekStart: Date,
  dailyTargetMinutes: number | null,
  options?: {
    unit?: DailyTargetUnit;
    dailyTargetTasks?: number | null;
  }
): WeeklySummary {
  const unit = options?.unit ?? "minute";
  const config: DailyTargetConfig = {
    unit,
    minutes: dailyTargetMinutes,
    tasks: options?.dailyTargetTasks ?? null,
  };
  const targetValue = resolveDailyTarget(config);

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
    const loadValue = dayLoadValue(dayTasks, unit);
    const hasTarget = targetValue != null && targetValue > 0;
    const tone = hasTarget ? densityTone(loadValue, targetValue) : null;
    const ratio = hasTarget ? loadValue / targetValue! : null;
    const dayLabel = DAY_LABELS_FULL[i];

    gunlukDagilim.push({
      dateStr,
      dayLabel,
      taskCount: dayTasks.length,
      totalMinutes,
      loadValue,
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
    targetUnit: unit,
    targetValue,
  };
}
