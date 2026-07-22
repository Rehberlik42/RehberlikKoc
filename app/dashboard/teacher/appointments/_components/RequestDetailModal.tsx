"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  formatDateTR,
  formatTimeTR,
} from "@/lib/appointments";
import type { AppointmentRow } from "../page";

interface Props {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentRow | null;
  onUpdated: (patch: Partial<AppointmentRow> & { id: number }) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

type Mode = "view" | "propose" | "reject";

export default function RequestDetailModal({
  open,
  onClose,
  appointment,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("view");
  const [proposedDate, setProposedDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setMode("view");
      setProposedDate("");
      setRejectReason("");
    }
  }, [open]);

  if (!open || !mounted || !appointment) return null;

  const a = appointment;

  const approve = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed", proposed_date: null, proposed_by: null })
      .eq("id", a.id);
    setBusy(false);
    if (error) {
      onError("Onaylanamadı: " + error.message);
      return;
    }
    onUpdated({ id: a.id, status: "confirmed", proposed_date: null });
    onSuccess("Randevu onaylandı. Öğrenciye bildirim gönderildi.");
    onClose();
  };

  const propose = async () => {
    if (!proposedDate) {
      onError("Önerilecek tarih ve saati seçin.");
      return;
    }
    setBusy(true);
    const iso = new Date(proposedDate).toISOString();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "proposed", proposed_date: iso })
      .eq("id", a.id);
    setBusy(false);
    if (error) {
      onError("Öneri gönderilemedi: " + error.message);
      return;
    }
    onUpdated({ id: a.id, status: "proposed", proposed_date: iso });
    onSuccess("Yeni saat önerisi öğrenciye gönderildi.");
    onClose();
  };

  const reject = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("appointments")
      .update({
        status: "rejected",
        rejection_reason: rejectReason.trim() || null,
      })
      .eq("id", a.id);
    setBusy(false);
    if (error) {
      onError("Reddedilemedi: " + error.message);
      return;
    }
    onUpdated({
      id: a.id,
      status: "rejected",
      rejection_reason: rejectReason.trim() || null,
    });
    onSuccess("Talep reddedildi. Öğrenciye bildirim gönderildi.");
    onClose();
  };

  const infoRows: [string, string][] = [
    ["Öğrenci", a.student?.full_name ?? "-"],
    ["Sınıf", a.student?.grade ? `${a.student.grade}. sınıf` : "-"],
    ["Görüşme Türü", MEETING_TYPE_LABELS[a.meeting_type] ?? a.meeting_type],
    ["Görüşme Şekli", MEETING_FORMAT_LABELS[a.meeting_format] ?? a.meeting_format],
    ["Tarih", formatDateTR(a.appointment_date)],
    ["Saat", formatTimeTR(a.appointment_date)],
    ["Süre", `${a.duration_minutes} dakika`],
  ];

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors [color-scheme:dark]";

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-base font-bold">
                Randevu Talebi Detayı
              </h3>
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-widest">
                Onay Bekliyor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            aria-label="Kapat"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] divide-y divide-[var(--border)]">
            {infoRows.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
                <span className="text-[var(--text-muted)] text-xs font-semibold">{k}</span>
                <span className="text-[var(--text-primary)] text-xs font-semibold text-right">{v}</span>
              </div>
            ))}
          </div>

          {a.notes && (
            <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3">
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1">
                Öğrencinin Açıklaması
              </p>
              <p className="text-[var(--text-secondary)] text-sm">{a.notes}</p>
            </div>
          )}

          {mode === "propose" && (
            <div className="space-y-3 rounded-xl border border-[var(--primary-2)]/25 bg-[var(--primary-2)]/10 px-4 py-3">
              <label className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Önerilecek Yeni Tarih ve Saat
              </label>
              <input
                type="datetime-local"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className={inputCls}
              />
              <p className="text-[var(--text-muted)] text-[11px]">
                Öneri öğrenciye bildirim olarak gider; kabul ederse randevu bu
                saate taşınıp onaylanır.
              </p>
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
              <label className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
                Ret Nedeni (öğrenciye iletilir)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Örn. Bu hafta programım dolu, gelecek hafta için tekrar talep oluşturabilirsin."
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {/* İşlemler */}
          {mode === "view" ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={busy}
                onClick={approve}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/40 text-[var(--success)] text-xs font-bold hover:bg-[var(--success)]/30 transition-colors disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Onayla
              </button>
              <button
                type="button"
                onClick={() => setMode("propose")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-xs font-bold hover:bg-[var(--primary)]/25 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Yeni Saat Öner
              </button>
              <button
                type="button"
                onClick={() => setMode("reject")}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/25 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reddet
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode("view")}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors"
              >
                Geri
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={mode === "propose" ? propose : reject}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 ${
                  mode === "propose"
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white shadow-lg shadow-[var(--primary)]/25"
                    : "bg-rose-500/80 text-white hover:bg-rose-500"
                }`}
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "propose" ? "Öneriyi Gönder" : "Talebi Reddet"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
