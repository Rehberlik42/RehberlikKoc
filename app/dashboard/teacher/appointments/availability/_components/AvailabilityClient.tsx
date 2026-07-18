"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Clock,
  Plus,
  Trash2,
  CalendarOff,
  Settings2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DAY_LABELS,
  type AvailabilityRule,
  type AvailabilityException,
  type AppointmentSettings,
} from "@/lib/appointments";

const SLOT_OPTIONS = [20, 30, 45, 60] as const;
const BUFFER_OPTIONS = [0, 5, 10, 15, 20] as const;

const inputCls =
  "px-2.5 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors [color-scheme:dark]";

const cardCls =
  "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4";

interface Props {
  teacherId: string;
  initialSettings: AppointmentSettings;
  initialRules: AvailabilityRule[];
  initialExceptions: AvailabilityException[];
}

export default function AvailabilityClient({
  teacherId,
  initialSettings,
  initialRules,
  initialExceptions,
}: Props) {
  const supabase = createClient();

  const [settings, setSettings] = useState(initialSettings);
  const [rules, setRules] = useState(initialRules);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [savingSettings, setSavingSettings] = useState(false);

  // Yeni kural formu (gün başına)
  const [newRule, setNewRule] = useState<{
    day: number;
    start: string;
    end: string;
  }>({ day: 1, start: "09:00", end: "17:00" });

  // Yeni istisna formu
  const [newException, setNewException] = useState<{
    date: string;
    allDay: boolean;
    start: string;
    end: string;
    reason: string;
  }>({ date: "", allDay: true, start: "09:00", end: "17:00", reason: "" });
  const [addingException, setAddingException] = useState(false);

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("teacher_appointment_settings")
      .upsert({ teacher_id: teacherId, ...settings, updated_at: new Date().toISOString() });
    setSavingSettings(false);
    if (error) toast.error("Ayarlar kaydedilemedi: " + error.message);
    else toast.success("Görüşme ayarları kaydedildi.");
  };

  const addRule = async () => {
    if (newRule.start >= newRule.end) {
      toast.error("Başlangıç saati bitişten önce olmalı.");
      return;
    }
    const { data, error } = await supabase
      .from("teacher_availability_rules")
      .insert({
        teacher_id: teacherId,
        day_of_week: newRule.day,
        start_time: newRule.start,
        end_time: newRule.end,
      })
      .select("id, day_of_week, start_time, end_time")
      .single();
    if (error || !data) {
      toast.error("Saat aralığı eklenemedi: " + (error?.message ?? ""));
      return;
    }
    setRules((prev) =>
      [...prev, data as AvailabilityRule].sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.start_time.localeCompare(b.start_time)
      )
    );
    toast.success("Çalışma saati eklendi.");
  };

  const removeRule = async (id: number) => {
    const prev = rules;
    setRules((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("teacher_availability_rules")
      .delete()
      .eq("id", id);
    if (error) {
      setRules(prev);
      toast.error("Silinemedi: " + error.message);
    }
  };

  const addException = async () => {
    if (!newException.date) {
      toast.error("Tarih seçin.");
      return;
    }
    if (!newException.allDay && newException.start >= newException.end) {
      toast.error("Başlangıç saati bitişten önce olmalı.");
      return;
    }
    setAddingException(true);
    const { data, error } = await supabase
      .from("teacher_availability_exceptions")
      .insert({
        teacher_id: teacherId,
        date: newException.date,
        start_time: newException.allDay ? null : newException.start,
        end_time: newException.allDay ? null : newException.end,
        reason: newException.reason.trim() || null,
      })
      .select("id, date, start_time, end_time, reason")
      .single();
    setAddingException(false);
    if (error || !data) {
      toast.error("Eklenemedi: " + (error?.message ?? ""));
      return;
    }
    setExceptions((prev) =>
      [...prev, data as AvailabilityException].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewException((p) => ({ ...p, date: "", reason: "" }));
    toast.success("Kapalı gün/saat eklendi.");
  };

  const removeException = async (id: number) => {
    const prev = exceptions;
    setExceptions((e) => e.filter((x) => x.id !== id));
    const { error } = await supabase
      .from("teacher_availability_exceptions")
      .delete()
      .eq("id", id);
    if (error) {
      setExceptions(prev);
      toast.error("Silinemedi: " + error.message);
    }
  };

  const labelCls =
    "text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6">
      {/* Görüşme ayarları */}
      <section className={cardCls}>
        <h3 className="text-[var(--text-primary)] font-bold flex items-center gap-2">
          <Settings2 className="w-4.5 h-4.5 text-[var(--accent)]" />
          Görüşme Ayarları
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Görüşme Süresi</label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, slot_minutes: m }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    settings.slot_minutes === m
                      ? "bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--accent)]"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {m} dk
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Görüşmeler Arası Boşluk</label>
            <div className="flex flex-wrap gap-1.5">
              {BUFFER_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({ ...s, buffer_minutes: m }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    settings.buffer_minutes === m
                      ? "bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--accent)]"
                      : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {m} dk
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Günlük Maks. Randevu</label>
            <input
              type="number"
              min={1}
              max={30}
              value={settings.max_daily}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  max_daily: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                }))
              }
              className={`${inputCls} w-24`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={savingSettings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-all disabled:opacity-40"
        >
          {savingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
          Ayarları Kaydet
        </button>
      </section>

      {/* Haftalık çalışma saatleri */}
      <section className={cardCls}>
        <h3 className="text-[var(--text-primary)] font-bold flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-[var(--accent)]" />
          Haftalık Çalışma Saatleri
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DAY_LABELS.map((label, idx) => {
            const day = idx + 1;
            const dayRules = rules.filter((r) => r.day_of_week === day);
            return (
              <div
                key={day}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"
              >
                <p className="text-[var(--text-primary)] text-sm font-bold mb-2">
                  {label}
                </p>
                {dayRules.length === 0 ? (
                  <p className="text-[var(--text-muted)] text-xs italic">
                    Kapalı
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {dayRules.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="tabular-nums">
                          {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRule(r.id)}
                          className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                          title="Aralığı sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Yeni aralık ekle */}
        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[var(--border)]">
          <div>
            <label className={labelCls}>Gün</label>
            <select
              value={newRule.day}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, day: Number(e.target.value) }))
              }
              className={inputCls}
            >
              {DAY_LABELS.map((l, i) => (
                <option key={i + 1} value={i + 1}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Başlangıç</label>
            <input
              type="time"
              value={newRule.start}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, start: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Bitiş</label>
            <input
              type="time"
              value={newRule.end}
              onChange={(e) =>
                setNewRule((p) => ({ ...p, end: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--primary)]/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Aralık Ekle
          </button>
        </div>
      </section>

      {/* Tatil / izin / kapalı saatler */}
      <section className={cardCls}>
        <h3 className="text-[var(--text-primary)] font-bold flex items-center gap-2">
          <CalendarOff className="w-4.5 h-4.5 text-[var(--accent)]" />
          Tatil, İzin ve Kapalı Saatler
        </h3>

        {exceptions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            Yaklaşan kapalı gün veya saat yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5"
              >
                <div className="text-sm">
                  <span className="text-[var(--text-primary)] font-semibold">
                    {new Date(`${e.date}T00:00:00`).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      weekday: "long",
                    })}
                  </span>
                  <span className="text-[var(--text-secondary)] ml-2">
                    {e.start_time
                      ? `${e.start_time.slice(0, 5)} – ${e.end_time!.slice(0, 5)}`
                      : "Tüm gün kapalı"}
                  </span>
                  {e.reason && (
                    <span className="text-[var(--text-muted)] ml-2 text-xs">
                      ({e.reason})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeException(e.id)}
                  className="text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[var(--border)]">
          <div>
            <label className={labelCls}>Tarih</label>
            <input
              type="date"
              value={newException.date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) =>
                setNewException((p) => ({ ...p, date: e.target.value }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kapsam</label>
            <select
              value={newException.allDay ? "all" : "range"}
              onChange={(e) =>
                setNewException((p) => ({
                  ...p,
                  allDay: e.target.value === "all",
                }))
              }
              className={inputCls}
            >
              <option value="all">Tüm gün</option>
              <option value="range">Belirli saatler</option>
            </select>
          </div>
          {!newException.allDay && (
            <>
              <div>
                <label className={labelCls}>Başlangıç</label>
                <input
                  type="time"
                  value={newException.start}
                  onChange={(e) =>
                    setNewException((p) => ({ ...p, start: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Bitiş</label>
                <input
                  type="time"
                  value={newException.end}
                  onChange={(e) =>
                    setNewException((p) => ({ ...p, end: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </>
          )}
          <div className="flex-1 min-w-[160px]">
            <label className={labelCls}>Açıklama (opsiyonel)</label>
            <input
              type="text"
              value={newException.reason}
              onChange={(e) =>
                setNewException((p) => ({ ...p, reason: e.target.value }))
              }
              placeholder="Örn. yıllık izin"
              className={`${inputCls} w-full`}
            />
          </div>
          <button
            type="button"
            onClick={addException}
            disabled={addingException}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--primary)]/25 transition-colors disabled:opacity-40"
          >
            {addingException ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Ekle
          </button>
        </div>
      </section>
    </div>
  );
}
