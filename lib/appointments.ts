// ─── Randevu Yönetim Modülü: ortak tipler, etiketler ve slot hesaplama ────────

export type MeetingType =
  | "student"
  | "parent"
  | "joint"
  | "program_review"
  | "exam_analysis"
  | "preference"
  | "intro"
  | "other";

export type MeetingFormat = "online" | "in_person" | "phone";

export type AppointmentStatus =
  | "pending"
  | "proposed"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type NoteVisibility =
  | "teacher"
  | "teacher_student"
  | "teacher_parent"
  | "all";

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  student: "Öğrenci Görüşmesi",
  parent: "Veli Görüşmesi",
  joint: "Ortak Görüşme",
  program_review: "Program Değerlendirme",
  exam_analysis: "Deneme Analizi",
  preference: "Tercih Danışmanlığı",
  intro: "Tanışma Görüşmesi",
  other: "Diğer",
};

export const MEETING_FORMAT_LABELS: Record<MeetingFormat, string> = {
  online: "Online",
  in_person: "Yüz Yüze",
  phone: "Telefon",
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Onay Bekliyor",
  proposed: "Yeni Saat Önerildi",
  confirmed: "Onaylandı",
  in_progress: "Görüşme Sürüyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
  rejected: "Reddedildi",
};

export const VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  teacher: "Sadece Öğretmen",
  teacher_student: "Öğretmen + Öğrenci",
  teacher_parent: "Öğretmen + Veli",
  all: "Herkes",
};

// ISO gün numarası (1 = Pazartesi … 7 = Pazar)
export const DAY_LABELS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

// ─── DB satır tipleri ────────────────────────────────────────────────────────
export interface AvailabilityRule {
  id: number;
  day_of_week: number; // 1-7 ISO
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface AvailabilityException {
  id: number;
  date: string; // "YYYY-MM-DD"
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface AppointmentSettings {
  slot_minutes: number;
  buffer_minutes: number;
  max_daily: number;
}

export const DEFAULT_SETTINGS: AppointmentSettings = {
  slot_minutes: 30,
  buffer_minutes: 10,
  max_daily: 8,
};

export interface BusySlot {
  starts_at: string; // ISO timestamptz
  ends_at: string;
}

export interface TimeSlot {
  start: string; // "HH:MM" yerel saat
  end: string;
  available: boolean;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Yerel tarihi "YYYY-MM-DD" formatına çevirir. */
export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO gün numarası: 1 = Pazartesi … 7 = Pazar */
export function isoDayOfWeek(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** "YYYY-MM-DD" + "HH:MM" → yerel Date */
export function combineDateTime(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00`);
}

/**
 * Bir gün için randevu slotlarını hesaplar.
 * Müsaitlik kuralları, istisnalar, mevcut randevular (buffer dahil),
 * günlük limit ve geçmiş saatler dikkate alınır.
 */
export function computeSlotsForDate(params: {
  dateKey: string;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  settings: AppointmentSettings;
  busy: BusySlot[];
  now?: Date;
}): TimeSlot[] {
  const { dateKey, rules, exceptions, settings, busy } = params;
  const now = params.now ?? new Date();
  const date = combineDateTime(dateKey, "00:00");
  const dow = isoDayOfWeek(date);

  const dayExceptions = exceptions.filter((e) => e.date === dateKey);
  // Tüm gün kapalıysa hiç slot yok
  if (dayExceptions.some((e) => e.start_time === null)) return [];

  const dayRules = rules.filter((r) => r.day_of_week === dow);
  if (dayRules.length === 0) return [];

  const blockedRanges = dayExceptions
    .filter((e) => e.start_time !== null && e.end_time !== null)
    .map((e) => ({
      start: timeToMinutes(e.start_time!),
      end: timeToMinutes(e.end_time!),
    }));

  // O günkü dolu randevular (dakika cinsinden, buffer eklenmiş)
  const busyRanges = busy
    .map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }))
    .filter((b) => toDateKey(b.start) === dateKey)
    .map((b) => ({
      start:
        b.start.getHours() * 60 + b.start.getMinutes() - settings.buffer_minutes,
      end: b.end.getHours() * 60 + b.end.getMinutes() + settings.buffer_minutes,
    }));

  const dayBusyCount = busyRanges.length;
  const step = settings.slot_minutes + settings.buffer_minutes;
  const slots: TimeSlot[] = [];

  for (const rule of dayRules) {
    const ruleStart = timeToMinutes(rule.start_time);
    const ruleEnd = timeToMinutes(rule.end_time);

    for (let s = ruleStart; s + settings.slot_minutes <= ruleEnd; s += step) {
      const e = s + settings.slot_minutes;
      const slotDate = combineDateTime(dateKey, minutesToTime(s));

      const overlapsBlocked = blockedRanges.some((r) => s < r.end && e > r.start);
      const overlapsBusy = busyRanges.some((r) => s < r.end && e > r.start);
      const inPast = slotDate.getTime() <= now.getTime();
      const dailyFull = dayBusyCount >= settings.max_daily;

      slots.push({
        start: minutesToTime(s),
        end: minutesToTime(e),
        available: !overlapsBlocked && !overlapsBusy && !inPast && !dailyFull,
      });
    }
  }

  slots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  return slots;
}

// ─── Format yardımcıları ─────────────────────────────────────────────────────
export function formatDateTR(iso: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
    ...opts,
  });
}

export function formatTimeTR(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
