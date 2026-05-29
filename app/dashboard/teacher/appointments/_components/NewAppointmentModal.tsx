"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CalendarPlus,
  User,
  Clock,
  StickyNote,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow, StudentOption } from "../page";

interface Props {
  open: boolean;
  onClose: () => void;
  students: StudentOption[];
  teacherId: string;
  onCreated: (appt: AppointmentRow) => void;
  onError: (message: string) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90] as const;

// Şu andan biraz ileri bir varsayılan zaman (1 saat sonrası, dk = 00)
function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  // datetime-local: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewAppointmentModal({
  open,
  onClose,
  students,
  teacherId,
  onCreated,
  onError,
}: Props) {
  const supabase = createClient();

  const [studentId, setStudentId] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>(
    defaultDatetimeLocal()
  );
  const [duration, setDuration] = useState<number>(45);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal için DOM hazır olunca render et
  useEffect(() => {
    setMounted(true);
  }, []);

  // Modal her açıldığında formu sıfırla
  useEffect(() => {
    if (open) {
      setStudentId(students[0]?.id ?? "");
      setAppointmentDate(defaultDatetimeLocal());
      setDuration(45);
      setNotes("");
    }
  }, [open, students]);

  // ESC ile kapatma
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      onError("Lütfen bir öğrenci seçin.");
      return;
    }
    if (!appointmentDate) {
      onError("Lütfen randevu tarihi ve saati girin.");
      return;
    }

    setLoading(true);

    // datetime-local → UTC ISO (Supabase timestamptz kullanır)
    const isoDate = new Date(appointmentDate).toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        appointment_date: isoDate,
        duration_minutes: duration,
        status: "pending",
        notes: notes.trim() || null,
      })
      .select(
        `id, appointment_date, duration_minutes, status, notes, session_notes, created_at,
         student:profiles!appointments_student_id_fkey(id, full_name, avatar_url, grade)`
      )
      .single();

    setLoading(false);

    if (error || !data) {
      onError("Randevu oluşturulamadı: " + (error?.message ?? "bilinmeyen"));
      return;
    }

    onCreated(data as unknown as AppointmentRow);
    onClose();
  };

  const selectedStudent = students.find((s) => s.id === studentId);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2FFF] to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#7B2FFF]/15 border border-[#7B2FFF]/25 flex items-center justify-center text-[#A78BFF]">
              <CalendarPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-white text-base font-bold">Yeni Randevu</h3>
              <p className="text-white/40 text-[11px]">
                Öğrencinle bir koçluk seansı planla
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors p-1"
            aria-label="Kapat"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {/* Öğrenci seçimi */}
          <div>
            <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              Öğrenci
            </label>
            {students.length === 0 ? (
              <p className="text-white/40 text-xs px-3 py-2 rounded-lg border border-dashed border-white/10 bg-white/3">
                Henüz sana öğrenci atanmamış.
              </p>
            ) : (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#05050f] border border-white/10 text-white text-sm focus:outline-none focus:border-[#7B2FFF]/50 focus:ring-2 focus:ring-[#7B2FFF]/20 transition-colors"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name ?? "İsimsiz Öğrenci"}
                    {s.grade ? ` · ${s.grade}. sınıf` : ""}
                  </option>
                ))}
              </select>
            )}
            {selectedStudent?.grade && (
              <p className="text-white/30 text-[10px] mt-1.5">
                Seçili: {selectedStudent.full_name} ({selectedStudent.grade}. sınıf)
              </p>
            )}
          </div>

          {/* Tarih/saat */}
          <div>
            <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              Tarih ve Saat
            </label>
            <input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg bg-[#05050f] border border-white/10 text-white text-sm focus:outline-none focus:border-[#4F7CFF]/50 focus:ring-2 focus:ring-[#4F7CFF]/20 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Süre preset chip'leri */}
          <div>
            <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">
              Süre (dakika)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    duration === d
                      ? "bg-[#7B2FFF]/20 border-[#7B2FFF]/40 text-[#A78BFF]"
                      : "bg-white/3 border-white/8 text-white/50 hover:text-white hover:border-white/15"
                  }`}
                >
                  {d} dk
                </button>
              ))}
            </div>
          </div>

          {/* Notlar */}
          <div>
            <label className="text-white/60 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              Notlar <span className="text-white/30 font-normal normal-case">(opsiyonel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Bu seansta ne konuşmayı planlıyorsun?"
              className="w-full px-3 py-2.5 rounded-lg bg-[#05050f] border border-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#7B2FFF]/50 focus:ring-2 focus:ring-[#7B2FFF]/20 transition-colors resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-white/60 hover:text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || students.length === 0 || !studentId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] text-white text-sm font-semibold shadow-lg shadow-[#7B2FFF]/25 hover:shadow-[#7B2FFF]/40 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  Randevuyu Oluştur
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
