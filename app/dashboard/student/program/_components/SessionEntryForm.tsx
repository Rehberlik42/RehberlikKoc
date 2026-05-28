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
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-white/50 text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 text-white text-sm placeholder-white/20
          focus:outline-none focus:border-transparent transition-all duration-200 text-center font-bold text-base"
        style={{
          ["--tw-ring-color" as string]: accentColor,
          boxShadow: undefined,
        }}
        onFocus={(e) =>
          (e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}55, 0 0 12px ${accentColor}22`)
        }
        onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
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
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-white/50 text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 pr-8 text-white text-sm
            appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none transition-all duration-200"
          onFocus={(e) =>
            (e.currentTarget.style.boxShadow =
              "0 0 0 2px #7B2FFF55, 0 0 12px #7B2FFF22")
          }
          onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
        >
          {children}
        </select>
        {/* custom arrow */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
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
      ? (parseFloat(correct) - parseFloat(wrong) / 4).toFixed(2)
      : null;

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

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="rounded-2xl border border-white/8 bg-[#0d0d2b]/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20 border border-[#7B2FFF]/20 flex items-center justify-center">
            <Save className="w-4 h-4 text-[#A78BFF]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Yeni Çalışma Girişi</h3>
            <p className="text-white/30 text-[11px]">Bugünkü çalışmanı kaydet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Ders + Konu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-3 gap-4">
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
              icon={<Clock className="w-3.5 h-3.5 text-[#7AB3FF]" />}
              value={duration}
              onChange={setDuration}
              accentColor="#4F7CFF"
            />
          </div>

          {/* Net önizleme */}
          {net !== null && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/4 border border-white/8">
              <span className="text-white/40 text-xs font-semibold uppercase tracking-wider">
                Hesaplanan Net
              </span>
              <span
                className={`text-sm font-black ml-auto ${
                  parseFloat(net) >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {parseFloat(net) >= 0 ? "+" : ""}
                {net}
              </span>
            </div>
          )}

          {/* Notlar */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-white/50 text-[11px] font-semibold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Not (opsiyonel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Bu konuda dikkat ettiğin şeyler, DORA'ya not..."
              className="w-full rounded-xl bg-white/4 border border-white/8 px-3 py-2.5 text-white text-sm placeholder-white/20 resize-none
                focus:outline-none transition-all duration-200"
              onFocus={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 0 0 2px #7B2FFF55, 0 0 12px #7B2FFF22")
              }
              onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm
              bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF]
              shadow-lg shadow-[#7B2FFF]/25
              hover:shadow-[#7B2FFF]/50 hover:scale-[1.01]
              disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed
              transition-all duration-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? "Kaydediliyor…" : "Çalışmayı Kaydet"}
          </button>
        </form>
      </div>
    </>
  );
}
