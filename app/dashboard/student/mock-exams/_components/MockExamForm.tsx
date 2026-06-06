"use client";

import { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  CalendarDays,
  Building2,
  Save,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ExamOption, SubjectOption } from "./MockExamsClient";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubjectInput {
  subjectId: number;
  subjectName: string;
  color: string | null;
  correct: string;
  wrong: string;
  empty: string;
}

interface Props {
  exams: ExamOption[];
  subjects: SubjectOption[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcNet(correct: string, wrong: string): number {
  const c = parseInt(correct) || 0;
  const w = parseInt(wrong) || 0;
  return c - w / 4;
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

// ─── Small subject row ────────────────────────────────────────────────────────
function SubjectInputRow({
  row,
  onChange,
}: {
  row: SubjectInput;
  onChange: (next: SubjectInput) => void;
}) {
  const net = calcNet(row.correct, row.wrong);
  const hasData = row.correct !== "" || row.wrong !== "" || row.empty !== "";

  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
        hasData
          ? "border-[#7B2FFF]/30 bg-[#0d0d2b]/60 shadow-[0_0_16px_rgba(123,47,255,0.12)]"
          : "border-white/8 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-5 rounded-full shrink-0"
            style={{ background: row.color ?? "#4F7CFF" }}
          />
          <p className="text-white text-sm font-semibold truncate">
            {row.subjectName}
          </p>
        </div>
        {hasData && (
          <span
            className={`text-xs font-black tabular-nums shrink-0 ${
              net >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {net.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniInput
          icon={<CheckCircle2 className="w-3 h-3 text-green-400" />}
          value={row.correct}
          onChange={(v) => onChange({ ...row, correct: v })}
          color="#22c55e"
        />
        <MiniInput
          icon={<XCircle className="w-3 h-3 text-red-400" />}
          value={row.wrong}
          onChange={(v) => onChange({ ...row, wrong: v })}
          color="#ef4444"
        />
        <MiniInput
          icon={<Circle className="w-3 h-3 text-white/40" />}
          value={row.empty}
          onChange={(v) => onChange({ ...row, empty: v })}
          color="#64748b"
        />
      </div>
    </div>
  );
}

function MiniInput({
  icon,
  value,
  onChange,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div className="relative">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {icon}
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-7 pr-2 text-center text-sm font-bold text-white placeholder-white/15 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
        style={{ ["--tw-ring-color" as string]: `${color}55` }}
      />
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export default function MockExamForm({
  exams,
  subjects,
  onSuccess,
  onError,
}: Props) {
  const supabase = createClient();

  const [examId, setExamId] = useState<string>(
    exams[0] ? String(exams[0].id) : ""
  );
  const [examDate, setExamDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [rows, setRows] = useState<SubjectInput[]>([]);
  const [loading, setLoading] = useState(false);

  // Sinav degistiginde dersleri o sinava gore yenile
  useEffect(() => {
    if (!examId) {
      setRows([]);
      return;
    }
    const id = parseInt(examId);
    const filtered = subjects
      .filter((s) => s.exam_id === id)
      .sort((a, b) => a.order_index - b.order_index)
      .map<SubjectInput>((s) => ({
        subjectId: s.id,
        subjectName: s.name,
        color: s.color,
        correct: "",
        wrong: "",
        empty: "",
      }));
    setRows(filtered);
  }, [examId, subjects]);

  // ─── Canli toplam ─────────────────────────────────────────────────────────
  const { totalNet, totalQuestions, hasAnyData } = useMemo(() => {
    let net = 0;
    let q = 0;
    let any = false;
    for (const r of rows) {
      const c = parseInt(r.correct) || 0;
      const w = parseInt(r.wrong) || 0;
      const e = parseInt(r.empty) || 0;
      if (r.correct !== "" || r.wrong !== "" || r.empty !== "") any = true;
      net += c - w / 4;
      q += c + w + e;
    }
    return { totalNet: net, totalQuestions: q, hasAnyData: any };
  }, [rows]);

  const animatedTotalNet = useAnimatedNumber(totalNet, hasAnyData);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examId) {
      onError("Lütfen sınav türünü seçin.");
      return;
    }
    if (!hasAnyData) {
      onError("En az bir derse veri girmelisiniz.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      onError("Oturum süresi doldu, tekrar giriş yapın.");
      return;
    }

    // 1) Once mock_exams kaydi
    const { data: mockExam, error: mockExamError } = await supabase
      .from("mock_exams")
      .insert({
        student_id: user.id,
        exam_id: parseInt(examId),
        exam_date: examDate,
        title: title.trim() || null,
        publisher: publisher.trim() || null,
        total_questions: totalQuestions > 0 ? totalQuestions : null,
      })
      .select("id")
      .single();

    if (mockExamError || !mockExam) {
      setLoading(false);
      onError("Deneme kaydedilemedi: " + (mockExamError?.message ?? "Bilinmeyen hata"));
      return;
    }

    // 2) Sonra her ders icin mock_exam_results
    const resultsPayload = rows
      .filter(
        (r) => r.correct !== "" || r.wrong !== "" || r.empty !== ""
      )
      .map((r) => ({
        mock_exam_id: mockExam.id,
        subject_id: r.subjectId,
        correct_count: parseInt(r.correct) || 0,
        wrong_count: parseInt(r.wrong) || 0,
        empty_count: parseInt(r.empty) || 0,
      }));

    if (resultsPayload.length > 0) {
      const { error: resultsError } = await supabase
        .from("mock_exam_results")
        .insert(resultsPayload);

      if (resultsError) {
        // Rollback: ana kaydi sil
        await supabase.from("mock_exams").delete().eq("id", mockExam.id);
        setLoading(false);
        onError("Sonuçlar kaydedilemedi: " + resultsError.message);
        return;
      }
    }

    setLoading(false);

    // Formu sifirla
    setTitle("");
    setPublisher("");
    setRows((prev) =>
      prev.map((r) => ({ ...r, correct: "", wrong: "", empty: "" }))
    );

    onSuccess(`Deneme kaydedildi! Toplam net: ${totalNet.toFixed(2)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20 border border-[#7B2FFF]/20 flex items-center justify-center">
          <Save className="w-4 h-4 text-[#A78BFF]" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Yeni Deneme Ekle</h3>
          <p className="text-white/30 text-[11px]">
            Sınav türü, tarih ve ders bazlı sonuçlar
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Sinav + Tarih */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Sınav Türü"
            icon={<GraduationCap className="w-3.5 h-3.5" />}
          >
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 pr-8 text-sm text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={String(ex.id)}>
                  {ex.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Tarih" icon={<CalendarDays className="w-3.5 h-3.5" />}>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]/40"
            />
          </FormField>
        </div>

        {/* Baslik + Yayinevi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Deneme Adı (opsiyonel)" icon={null}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ör. Genel Deneme 5"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
            />
          </FormField>

          <FormField
            label="Yayın (opsiyonel)"
            icon={<Building2 className="w-3.5 h-3.5" />}
          >
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="ör. 3D, Limit, ÖSYM"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]/40"
            />
          </FormField>
        </div>

        {/* Ders bazli giris */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">
              Ders Bazlı Sonuçlar
            </p>
            <div className="flex items-center gap-3 text-[10px] text-white/30 uppercase tracking-wider font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> D
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-2.5 h-2.5 text-red-400" /> Y
              </span>
              <span className="flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 text-white/40" /> B
              </span>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-white/8 border-dashed bg-white/2 px-4 py-6 text-center text-white/30 text-xs">
              Bu sınav türü için ders tanımlanmamış.
            </div>
          ) : (
            <div className="custom-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div
                  key={`${examId}-${row.subjectId}`}
                  className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
                  style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                >
                  <SubjectInputRow
                    row={row}
                    onChange={(next) => {
                      setRows((prev) => {
                        const copy = [...prev];
                        copy[idx] = next;
                        return copy;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toplam ozet */}
        <div className="rounded-xl bg-gradient-to-br from-[#7B2FFF]/15 to-[#4F7CFF]/10 border border-[#7B2FFF]/25 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A78BFF]" />
            <span className="text-white/60 text-[11px] font-semibold uppercase tracking-wider">
              Tahmini Toplam Net
            </span>
          </div>
          <span
            className={`text-xl font-black tabular-nums transition-colors duration-300 ${
              totalNet >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {hasAnyData
              ? `${animatedTotalNet >= 0 ? "+" : ""}${animatedTotalNet.toFixed(2)}`
              : "—"}
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !hasAnyData}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] py-3 text-sm font-bold text-white shadow-lg shadow-[#7B2FFF]/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-[#7B2FFF]/50 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {loading ? "Kaydediliyor…" : "Denemeyi Kaydet"}
        </button>
      </div>
    </form>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────
function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-white/50 text-[11px] font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
