"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Send,
  CalendarDays,
  Video,
  Users2,
  Phone,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  computeSlotsForDate,
  combineDateTime,
  toDateKey,
  formatDateTR,
  type MeetingType,
  type MeetingFormat,
  type AppointmentSettings,
  type AvailabilityRule,
  type AvailabilityException,
  type BusySlot,
  type TimeSlot,
} from "@/lib/appointments";
import type { TeacherInfo } from "./StudentAppointmentsClient";

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const WEEKDAYS_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const FORMAT_ICONS: Record<MeetingFormat, React.ReactNode> = {
  online: <Video className="w-4 h-4" />,
  in_person: <Users2 className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
};

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  teacher: TeacherInfo;
  settings: AppointmentSettings;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  /** Dolu ise mevcut randevu yeniden planlanır (Başka Saat Seç akışı). */
  rescheduleId?: number | null;
  onSubmitted: () => void;
  onError: (msg: string) => void;
}

export default function RequestWizard({
  open,
  onClose,
  studentId,
  teacher,
  settings,
  rules,
  exceptions,
  rescheduleId,
  onSubmitted,
  onError,
}: Props) {
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [meetingType, setMeetingType] = useState<MeetingType>("student");
  const [meetingFormat, setMeetingFormat] = useState<MeetingFormat>("online");
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setStep(1);
      setMeetingType("student");
      setMeetingFormat("online");
      setSelectedDate(null);
      setSelectedSlot(null);
      setDescription("");
      const d = new Date();
      setMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [open]);

  // Görünen ayın dolu saatlerini çek
  const loadBusy = useCallback(async () => {
    const from = toDateKey(monthCursor);
    const to = toDateKey(
      new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
    );
    const { data } = await supabase.rpc("get_teacher_busy_slots", {
      p_teacher_id: teacher.id,
      p_from: from,
      p_to: to,
    });
    setBusy((data ?? []) as BusySlot[]);
  }, [supabase, teacher.id, monthCursor]);

  useEffect(() => {
    if (open) loadBusy();
  }, [open, loadBusy]);

  // Ay içindeki günler için müsaitlik özeti
  const daysInMonth = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: count }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const key = toDateKey(date);
      const isPast = date < today;
      const slots = isPast
        ? []
        : computeSlotsForDate({ dateKey: key, rules, exceptions, settings, busy });
      return {
        key,
        day: i + 1,
        isPast,
        hasAvailable: slots.some((s) => s.available),
      };
    });
  }, [monthCursor, rules, exceptions, settings, busy]);

  const slotsForSelected = useMemo(() => {
    if (!selectedDate) return [];
    return computeSlotsForDate({
      dateKey: selectedDate,
      rules,
      exceptions,
      settings,
      busy,
    });
  }, [selectedDate, rules, exceptions, settings, busy]);

  if (!open || !mounted) return null;

  // Ayın ilk gününün grid ofseti (Pzt=0)
  const firstDow = (() => {
    const d = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  const canGoBack =
    monthCursor.getFullYear() > new Date().getFullYear() ||
    (monthCursor.getFullYear() === new Date().getFullYear() &&
      monthCursor.getMonth() > new Date().getMonth());

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    const iso = combineDateTime(selectedDate, selectedSlot.start).toISOString();

    let error;
    if (rescheduleId) {
      ({ error } = await supabase
        .from("appointments")
        .update({
          appointment_date: iso,
          duration_minutes: settings.slot_minutes,
          meeting_type: meetingType,
          meeting_format: meetingFormat,
          notes: description.trim() || null,
          status: "pending",
          proposed_date: null,
          proposed_by: null,
        })
        .eq("id", rescheduleId));
    } else {
      ({ error } = await supabase.from("appointments").insert({
        student_id: studentId,
        teacher_id: teacher.id,
        appointment_date: iso,
        duration_minutes: settings.slot_minutes,
        meeting_type: meetingType,
        meeting_format: meetingFormat,
        notes: description.trim() || null,
        status: "pending",
        created_by: studentId,
      }));
    }

    setSubmitting(false);
    if (error) {
      onError("Randevu talebi gönderilemedi: " + error.message);
      return;
    }
    onSubmitted();
    onClose();
  };

  const stepBadge = (n: number, label: string) => (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${
          step > n
            ? "bg-[var(--success)]/20 border-[var(--success)]/40 text-[var(--success)]"
            : step === n
            ? "bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--accent)]"
            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]"
        }`}
      >
        {step > n ? <Check className="w-3 h-3" /> : n}
      </span>
      <span
        className={`text-xs font-semibold hidden sm:inline ${
          step === n ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        }`}
      >
        {label}
      </span>
    </div>
  );

  const chipCls = (active: boolean) =>
    `px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
      active
        ? "bg-[var(--primary)]/20 border-[var(--primary)]/50 text-[var(--accent)]"
        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/30"
    }`;

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[var(--text-primary)] text-base font-bold">
              {rescheduleId ? "Başka Saat Seç" : "Randevu Al"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
              aria-label="Kapat"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            {stepBadge(1, "Bilgiler")}
            <div className="flex-1 h-px bg-[var(--border)]" />
            {stepBadge(2, "Tarih & Saat")}
            <div className="flex-1 h-px bg-[var(--border)]" />
            {stepBadge(3, "Onay")}
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* ─── Adım 1: Bilgiler ─── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(teacher.full_name ?? "?")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-bold">
                    {teacher.full_name ?? "Öğretmen"}
                  </p>
                  <p className="text-[var(--text-muted)] text-[11px]">Öğretmenin</p>
                </div>
              </div>

              <div>
                <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Görüşme Türü
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMeetingType(t)}
                      className={chipCls(meetingType === t)}
                    >
                      {MEETING_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider mb-2">
                  Görüşme Şekli
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MEETING_FORMAT_LABELS) as MeetingFormat[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMeetingFormat(f)}
                      className={`${chipCls(meetingFormat === f)} flex items-center gap-1.5 justify-center`}
                    >
                      {FORMAT_ICONS[f]}
                      {MEETING_FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── Adım 2: Tarih & Saat ─── */}
          {step === 2 && (
            <>
              {/* Ay takvimi */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() =>
                      setMonthCursor(
                        (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                      )
                    }
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-[var(--text-primary)] text-sm font-bold">
                    {MONTHS_TR[monthCursor.getMonth()]} {monthCursor.getFullYear()}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setMonthCursor(
                        (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                      )
                    }
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS_TR.map((w) => (
                    <span key={w} className="text-[var(--text-muted)] text-[10px] font-bold py-1">
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <span key={`e-${i}`} />
                  ))}
                  {daysInMonth.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      disabled={d.isPast || !d.hasAvailable}
                      onClick={() => {
                        setSelectedDate(d.key);
                        setSelectedSlot(null);
                      }}
                      className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                        selectedDate === d.key
                          ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white shadow-lg shadow-[var(--primary)]/30"
                          : d.isPast || !d.hasAvailable
                          ? "text-[var(--text-muted)]/40 cursor-not-allowed"
                          : "text-[var(--text-primary)] hover:bg-[var(--primary)]/15 border border-[var(--primary)]/20"
                      }`}
                    >
                      {d.day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saat slotları */}
              {selectedDate && (
                <div>
                  <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider mb-2">
                    {formatDateTR(combineDateTime(selectedDate, "00:00"))} · Müsait Saatler
                  </p>
                  {slotsForSelected.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-sm">
                      Bu gün için tanımlı çalışma saati yok.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsForSelected.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setSelectedSlot(s)}
                          className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all tabular-nums ${
                            selectedSlot?.start === s.start
                              ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] border-transparent text-white shadow-lg shadow-[var(--primary)]/25"
                              : s.available
                              ? "bg-[var(--surface-2)] border-[var(--success)]/30 text-[var(--text-primary)] hover:border-[var(--primary)]/50"
                              : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]/50 line-through cursor-not-allowed"
                          }`}
                        >
                          {s.start} – {s.end}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Açıklama */}
              <div>
                <p className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                  Açıklama <span className="font-normal normal-case">(isteğe bağlı)</span>
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Örn. Son TYT denememi değerlendirmek istiyorum."
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors resize-none"
                />
              </div>
            </>
          )}

          {/* ─── Adım 3: Özet ─── */}
          {step === 3 && selectedDate && selectedSlot && (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] divide-y divide-[var(--border)]">
                {[
                  ["Öğretmen", teacher.full_name ?? "-"],
                  ["Görüşme Türü", MEETING_TYPE_LABELS[meetingType]],
                  ["Görüşme Şekli", MEETING_FORMAT_LABELS[meetingFormat]],
                  ["Tarih", formatDateTR(combineDateTime(selectedDate, "00:00"))],
                  ["Saat", `${selectedSlot.start} – ${selectedSlot.end}`],
                  ["Süre", `${settings.slot_minutes} dakika`],
                  ...(description.trim() ? [["Açıklama", description.trim()]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <span className="text-[var(--text-muted)] text-xs font-semibold">{k}</span>
                    <span className="text-[var(--text-primary)] text-xs font-semibold text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3">
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                  Randevu talebin öğretmenine iletilecek. Öğretmenin onayladığında
                  randevu kesinleşir ve sana bildirim gönderilir.
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Geri
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 2 && (!selectedDate || !selectedSlot)}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                İleri
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-all disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Talebi Gönder
              </button>
            )}
          </div>

          {step === 2 && !selectedDate && (
            <p className="text-[var(--text-muted)] text-[11px] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Yalnızca öğretmenin müsait olduğu gün ve saatler seçilebilir.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
