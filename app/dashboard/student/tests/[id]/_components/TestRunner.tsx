"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  Focus,
  Sparkles,
  Flame,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CheckCheck,
  Send,
  RotateCcw,
  ArrowRight,
  ArrowLeft as ArrowLeftIcon,
  HeartPulse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  calculateScore,
  interpretScore,
  isComplete,
  scoreRange,
  typeMeta,
  type PsychologicalTest,
  type TestInterpretation,
  type TestType,
} from "@/lib/tests";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  test: PsychologicalTest;
  testType: TestType;
  previousResult: {
    score: number | null;
    interpretation: string | null;
    taken_at: string;
  } | null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string };

function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose, toast]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === "success"
          ? "bg-[#0d1f0d] border-green-500/30 text-green-400 shadow-green-500/10"
          : "bg-[#1f0d0d] border-red-500/30 text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="w-4.5 h-4.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

// ─── İkon ─────────────────────────────────────────────────────────────────────
function pickIcon(type: TestType) {
  switch (type) {
    case "anxiety":
      return Activity;
    case "focus":
      return Focus;
    case "motivation":
      return Sparkles;
    case "burnout":
      return Flame;
    case "general":
    default:
      return Brain;
  }
}

// ─── Sonuç renk paleti (seviye + kategoriye göre) ────────────────────────────
function resultPalette(level: string | undefined, type: TestType) {
  // Anxiety / burnout için "high" kötüdür → kırmızı palette
  // Diğerleri için "high" iyidir → yeşil
  const negativeType = type === "anxiety" || type === "burnout";
  const isPositive =
    (negativeType && level === "low") ||
    (!negativeType && level === "high");
  const isNeutral = level === "medium";

  if (isPositive)
    return {
      bg: "from-emerald-500/20 to-transparent",
      border: "border-emerald-500/35",
      ring: "ring-emerald-500/30",
      text: "text-emerald-300",
      glow: "rgba(16,185,129,0.45)",
      label: "Olumlu",
    };
  if (isNeutral)
    return {
      bg: "from-[var(--primary-2)]/20 to-transparent",
      border: "border-[var(--primary-2)]/35",
      ring: "ring-[var(--primary-2)]/30",
      text: "text-[var(--accent)]",
      glow: "rgba(79,124,255,0.45)",
      label: "Dengeli",
    };
  return {
    bg: "from-rose-500/20 to-transparent",
    border: "border-rose-500/35",
    ring: "ring-rose-500/30",
    text: "text-rose-300",
    glow: "rgba(244,63,94,0.45)",
    label: "Dikkat",
  };
}

// ─── Animated number (RAF) ────────────────────────────────────────────────────
function useAnimatedNumber(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    setValue(0);
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function TestRunner({ test, testType, previousResult }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const meta = typeMeta(testType);
  const Icon = pickIcon(testType);
  const definition = test.questions;
  const { items, scale } = definition;
  const range = scoreRange(definition);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    score: number;
    interpretation: TestInterpretation | null;
  } | null>(null);

  // Klavye ile ileri/geri (1-5 tuşları seçer, sonraki soruya geçer)
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const total = items.length;
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / total) * 100);
  const ready = isComplete(definition, answers);

  // Cevap kaydet → kısa gecikmeyle bir sonraki soruya kaydır
  const handleSelect = useCallback(
    (itemId: number, value: number, idx: number) => {
      setAnswers((prev) => ({ ...prev, [itemId]: value }));
      // sadece henüz cevaplanmamış soruda otomatik kaydır
      if (!(itemId in answers) && idx < total - 1) {
        const nextIdx = idx + 1;
        setActiveIdx(nextIdx);
        setTimeout(() => {
          document
            .getElementById(`q-${items[nextIdx]?.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }
    },
    [answers, items, total]
  );

  const handleReset = () => {
    setAnswers({});
    setSubmittedResult(null);
    setActiveIdx(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!ready) {
      setToast({
        type: "error",
        message: `Tüm soruları cevapla (${answeredCount}/${total}).`,
      });
      return;
    }
    setSubmitting(true);

    const score = calculateScore(definition, answers);
    const interpretation = interpretScore(definition, score);
    const summary = interpretation
      ? `${interpretation.label}: ${interpretation.summary}`
      : `Skor: ${score}`;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setToast({ type: "error", message: "Oturum bulunamadı." });
      return;
    }

    const { error } = await supabase.from("test_results").insert({
      student_id: user.id,
      test_id: test.id,
      answers,
      score,
      interpretation: summary,
    });

    setSubmitting(false);

    if (error) {
      setToast({
        type: "error",
        message: "Kaydedilemedi: " + error.message,
      });
      return;
    }

    setSubmittedResult({ score, interpretation });
    setToast({ type: "success", message: "Test sonucu kaydedildi." });
    router.refresh();
  };

  // ─── Sonuç ekranı ─────────────────────────────────────────────────────────
  if (submittedResult) {
    return (
      <>
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        <ResultScreen
          test={test}
          testType={testType}
          score={submittedResult.score}
          range={range}
          interpretation={submittedResult.interpretation}
          onReset={handleReset}
        />
      </>
    );
  }

  // ─── Form ekranı ──────────────────────────────────────────────────────────
  return (
    <>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Test başlık kartı */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md p-5 overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-[80px] opacity-40 pointer-events-none"
          style={{ background: meta.color }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0"
            style={{
              background: `${meta.color}1a`,
              borderColor: `${meta.color}50`,
              color: meta.color,
            }}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: `${meta.color}14`,
                borderColor: `${meta.color}40`,
                color: meta.color,
              }}
            >
              {meta.label}
            </span>
            <h1 className="text-[var(--text-primary)] text-2xl font-black mt-1.5">
              {test.title}
            </h1>
            {test.description && (
              <p className="text-[var(--text-secondary)] text-sm mt-1.5 leading-relaxed">
                {test.description}
              </p>
            )}
            {previousResult && previousResult.score !== null && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                Daha önce çözdün — son skor:{" "}
                <span className="text-[var(--text-secondary)] font-semibold">
                  {previousResult.score}
                </span>
                . Bu çözüş eskisinin üstüne yeni bir kayıt oluşturacak.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* İlerleme şeridi (sticky) */}
      <div className="sticky top-2 z-20">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold">
              {answeredCount} / {total} cevaplandı
            </span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${meta.color}, #4F7CFF)`,
                boxShadow: `0 0 12px ${meta.color}80`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Soru listesi */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const selected = answers[item.id];
          const isAnswered = typeof selected === "number";
          const isActive = idx === activeIdx;

          return (
            <div
              id={`q-${item.id}`}
              key={item.id}
              className={`relative rounded-2xl border bg-[var(--surface)]/40 p-5 backdrop-blur-md transition-all duration-500 ease-out ${
                isAnswered
                  ? "scale-[0.995] border-[var(--border)] opacity-75"
                  : isActive
                    ? "scale-100 border-[var(--primary)]/40 shadow-lg shadow-[var(--primary)]/15 ring-1 ring-[var(--primary)]/20"
                    : "scale-100 border-[var(--border)] opacity-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black tabular-nums shrink-0 ${
                    isAnswered
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                  }`}
                >
                  {isAnswered ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <p className="text-[var(--text-primary)] text-sm sm:text-base font-medium leading-relaxed flex-1">
                  {item.text}
                </p>
              </div>

              {/* Likert seçenekleri */}
              <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
                {Array.from({ length: scale.max - scale.min + 1 }).map(
                  (_, i) => {
                    const value = scale.min + i;
                    const label = scale.labels[i] ?? String(value);
                    const isSelected = selected === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSelect(item.id, value, idx)}
                        className={`group/btn relative flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 text-[10px] font-semibold transition-all duration-200 sm:text-[11px] ${
                          isSelected
                            ? "scale-105 border-[var(--primary)]/50 bg-[var(--primary)]/20 text-[var(--text-primary)] shadow-md shadow-[var(--primary)]/25"
                            : "scale-100 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:scale-[1.02] hover:border-[var(--border)] hover:bg-white/[0.05] hover:text-[var(--text-primary)] active:scale-95"
                        }`}
                        title={label}
                      >
                        <span
                          className={`text-base sm:text-lg font-black tabular-nums ${
                            isSelected ? "text-[var(--accent)]" : ""
                          }`}
                        >
                          {value}
                        </span>
                        <span className="leading-tight text-center hidden sm:block">
                          {label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="sticky bottom-2 z-20 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          {ready ? (
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hazırsın!
            </span>
          ) : (
            <span>
              {total - answeredCount} soru kaldı · Tümünü cevapla ve kaydet.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={submitting || answeredCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Temizle
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!ready || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-[var(--text-primary)] text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Hesaplanıyor…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Tamamla ve Sonucu Gör
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Sonuç ekranı ─────────────────────────────────────────────────────────────
function ResultScreen({
  test,
  testType,
  score,
  range,
  interpretation,
  onReset,
}: {
  test: PsychologicalTest;
  testType: TestType;
  score: number;
  range: { min: number; max: number };
  interpretation: TestInterpretation | null;
  onReset: () => void;
}) {
  const meta = typeMeta(testType);
  const palette = resultPalette(interpretation?.level, testType);
  const [mounted, setMounted] = useState(false);
  const animatedScore = useAnimatedNumber(score, mounted, 900);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 0-100 arası normalize
  const pct = useMemo(() => {
    const span = Math.max(1, range.max - range.min);
    return Math.round(((score - range.min) / span) * 100);
  }, [score, range]);

  const barPct = mounted ? pct : 0;

  return (
    <div className="space-y-6">
      {/* Hero result */}
      <div
        className={`relative animate-in fade-in slide-in-from-bottom-4 fill-mode-both rounded-3xl border bg-gradient-to-br p-6 duration-500 md:p-8 ${palette.bg} overflow-hidden ${palette.border}`}
      >
        <div
          aria-hidden
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full blur-[100px] opacity-60 pointer-events-none"
          style={{ background: palette.glow }}
        />

        <div className="relative flex items-start gap-4 flex-wrap">
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 ring-4 ${palette.ring}`}
            style={{
              background: `${meta.color}1a`,
              borderColor: `${meta.color}50`,
              color: meta.color,
            }}
          >
            <HeartPulse className="w-8 h-8" />
          </div>

          <div className="flex-1 min-w-0">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border"
              style={{
                background: `${meta.color}14`,
                borderColor: `${meta.color}40`,
                color: meta.color,
              }}
            >
              {meta.label} sonucu
            </span>
            <h2 className="text-[var(--text-primary)] text-2xl sm:text-3xl font-black mt-1.5">
              {interpretation?.label ?? "Sonuç hazır"}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed max-w-2xl">
              {interpretation?.summary ?? "Skorun başarıyla hesaplandı."}
            </p>
          </div>
        </div>

        {/* Skor barı */}
        <div className="relative mt-6">
          <div className="flex items-end justify-between mb-2 text-[11px] text-[var(--text-muted)]">
            <span>
              Skor:{" "}
              <span className={`text-2xl font-black tabular-nums ${palette.text}`}>
                {Math.round(animatedScore)}
              </span>
              <span className="text-[var(--text-muted)]"> / {range.max}</span>
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-out"
              style={{
                width: `${barPct}%`,
                background: `linear-gradient(90deg, ${meta.color}, ${palette.glow})`,
                boxShadow: `0 0 16px ${palette.glow}`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[var(--text-muted)]">
            <span>{range.min}</span>
            <span>{range.max}</span>
          </div>
        </div>
      </div>

      {/* DORA önerisi */}
      {interpretation?.doraSuggestion && (
        <div className="relative rounded-2xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] p-5 overflow-hidden">
          <div
            aria-hidden
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[70px] opacity-35 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(123,47,255,0.5) 0%, transparent 70%)",
            }}
          />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                DORA önerisi
              </p>
              <p className="text-[var(--text-primary)] text-sm font-medium mt-1.5 leading-relaxed">
                {interpretation.doraSuggestion}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aksiyon butonları */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold hover:bg-white/10 hover:border-[var(--border)] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Bir kez daha çöz
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/student/tests"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Diğer testler
          </Link>
          <Link
            href="/dashboard/student/recommendations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-[var(--text-primary)] text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 hover:scale-[1.02] active:scale-100 transition-all"
          >
            DORA önerilerine git
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Süre damgası alt bilgi (gizli not — test başlığını da göster) */}
      <p className="text-center text-[var(--text-muted)] text-[11px]">
        {test.title} · {new Date().toLocaleString("tr-TR")}
      </p>
    </div>
  );
}
