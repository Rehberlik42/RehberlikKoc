"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Save,
  Loader2,
  CheckCheck,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Topic {
  id: number;
  name: string;
  order_index: number;
}

export interface Subject {
  id: number;
  name: string;
  order_index: number;
  exam: { name: string } | null;
  topics: Topic[];
}

interface Props {
  subjects: Subject[];
  onSuccess: () => void;
}

function useAnimatedNumber(target: number, active: boolean, duration = 500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active, duration]);

  return value;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";

function Toast({
  type,
  message,
  onClose,
}: {
  type: ToastType;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
        type === "success"
          ? "bg-[#0d1f0d] border-green-500/30 text-green-400 shadow-green-500/10"
          : "bg-[#1f0d0d] border-red-500/30 text-red-400 shadow-red-500/10"
      }`}
    >
      {type === "success" ? (
        <CheckCheck className="w-4.5 h-4.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
function NumInput({
  label,
  icon,
  value,
  onChange,
  min = 0,
  accentColor = "#7B2FFF",
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  accentColor?: string;
}) {
  const hasValue = value !== "";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2.5 text-center text-base text-sm font-bold text-[var(--text-primary)] placeholder-white/20 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${
          hasValue
            ? "border-[var(--border)] bg-white/[0.06]"
            : "border-[var(--border)] bg-[var(--surface-2)]"
        }`}
        style={{
          ["--tw-ring-color" as string]: `${accentColor}55`,
          boxShadow: hasValue ? `0 0 14px ${accentColor}22` : undefined,
        }}
        placeholder="0"
      />
    </div>
  );
}

// ─── Select field ─────────────────────────────────────────────────────────────
function SelectField({
  label,
  icon,
  value,
  onChange,
  children,
  disabled = false,
  highlighted = false,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 transition-opacity duration-300 ${
        disabled ? "opacity-50" : "opacity-100"
      }`}
    >
      <label className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm text-[var(--text-primary)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed ${
            highlighted
              ? "cursor-pointer border-[var(--primary)]/25 bg-[var(--primary)]/[0.06] shadow-[0_0_12px_rgba(123,47,255,0.1)]"
              : "cursor-pointer border-[var(--border)] bg-[var(--surface-2)]"
          }`}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export default function SessionEntryForm({ subjects, onSuccess }: Props) {
  const supabase = createClient();

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];

  // Ders degistiginde konuyu sifirla
  useEffect(() => {
    setTopicId("");
  }, [subjectId]);

  const net =
    correct !== "" && wrong !== ""
      ? parseFloat(correct) - parseFloat(wrong) / 4
      : null;

  const animatedNet = useAnimatedNumber(net ?? 0, net !== null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setToast({ type: "error", message: "Lütfen bir ders seçin." });
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setToast({ type: "error", message: "Oturum süresi doldu, lütfen tekrar giriş yapın." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("study_sessions").insert({
      student_id: user.id,
      subject_id: parseInt(subjectId),
      topic_id: topicId ? parseInt(topicId) : null,
      correct_count: parseInt(correct) || 0,
      wrong_count: parseInt(wrong) || 0,
      questions_solved: (parseInt(correct) || 0) + (parseInt(wrong) || 0),
      duration_minutes: parseInt(duration) || 0,
      notes: notes.trim() || null,
      study_date: new Date().toISOString().split("T")[0],
    });

    setLoading(false);

    if (error) {
      setToast({ type: "error", message: "Kayıt sırasında hata oluştu: " + error.message });
      return;
    }

    setToast({ type: "success", message: "Çalışma kaydedildi! DORA bunu not etti 🎯" });
    // Formu temizle
    setSubjectId("");
    setTopicId("");
    setCorrect("");
    setWrong("");
    setDuration("");
    setNotes("");
    onSuccess();
  };

  const netDisplay =
    net !== null
      ? `${animatedNet >= 0 ? "+" : ""}${animatedNet.toFixed(2)}`
      : null;

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-2)]/20">
            <Save className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Yeni Çalışma Girişi</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Bugünkü çalışmanı kaydet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Ders + Konu */}
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: "0ms" }}
          >
            <SelectField
              label="Ders"
              icon={<BookOpen className="w-3.5 h-3.5" />}
              value={subjectId}
              onChange={setSubjectId}
            >
              <option value="">— Ders seçin —</option>
              {subjects.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.exam ? `[${s.exam.name}] ` : ""}
                  {s.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Konu (opsiyonel)"
              icon={<Tag className="w-3.5 h-3.5" />}
              value={topicId}
              onChange={setTopicId}
              disabled={!subjectId || topics.length === 0}
              highlighted={Boolean(subjectId && topics.length > 0)}
            >
              <option value="">— Konu seçin —</option>
              {topics.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Doğru / Yanlış / Süre */}
          <div
            className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: "50ms" }}
          >
            <NumInput
              label="Doğru"
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
              value={correct}
              onChange={setCorrect}
              accentColor="#22c55e"
            />
            <NumInput
              label="Yanlış"
              icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
              value={wrong}
              onChange={setWrong}
              accentColor="#ef4444"
            />
            <NumInput
              label="Süre (dk)"
              icon={<Clock className="w-3.5 h-3.5 text-[var(--accent)]" />}
              value={duration}
              onChange={setDuration}
              accentColor="#4F7CFF"
            />
          </div>

          {/* Net önizleme */}
          {net !== null && netDisplay && (
            <div className="animate-in fade-in slide-in-from-top-1 fill-mode-both flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 duration-300">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Hesaplanan Net
              </span>
              <span
                className={`ml-auto text-sm font-black tabular-nums ${
                  net >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {netDisplay}
              </span>
            </div>
          )}

          {/* Notlar */}
          <div
            className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: "100ms" }}
          >
            <label className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Not (opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Bu konuda dikkat ettiğin şeyler, DORA'ya not..."
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-[var(--primary)]/50 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
            style={{ animationDelay: "150ms" }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? "Kaydediliyor…" : "Çalışmayı Kaydet"}
          </button>
        </form>
      </div>
    </>
  );
}
