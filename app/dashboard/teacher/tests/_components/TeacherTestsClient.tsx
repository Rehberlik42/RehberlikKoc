"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  X,
  Search,
  Filter,
  HeartPulse,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Minus,
} from "lucide-react";
import {
  calculateScore,
  interpretScore,
  scoreRange,
  typeMeta,
  type PsychologicalTest,
  type TestType,
} from "@/lib/tests";
import { initialsFromName } from "@/lib/student-helpers";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TeacherTestResult {
  id: number;
  score: number | null;
  interpretation: string | null;
  answers: Record<string, number>;
  takenAt: string;
  student: {
    id: string;
    full_name: string | null;
    grade: string | null;
    avatar_url: string | null;
  } | null;
  test: {
    id: number;
    title: string;
    type: string;
    description: string | null;
    questions: PsychologicalTest["questions"];
  } | null;
}

interface Props {
  results: TeacherTestResult[];
  hasStudents: boolean;
}

type TypeFilter = "all" | TestType;

// ─── Risk göstergesi (anxiety/burnout için yüksek = kötü) ─────────────────────
function riskLevel(result: TeacherTestResult): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  const test = result.test;
  if (!test || result.score === null)
    return {
      label: "—",
      className: "bg-white/5 text-white/40 border-white/10",
      icon: <Minus className="w-3 h-3" />,
    };

  const interp = interpretScore(test.questions, result.score);
  const type = test.type as TestType;
  const negative = type === "anxiety" || type === "burnout";

  const isHigh = interp?.level === "high";
  const isMedium = interp?.level === "medium";
  const isLow = interp?.level === "low";

  if ((negative && isHigh) || (!negative && isLow)) {
    return {
      label: "Dikkat",
      className: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }
  if (isMedium) {
    return {
      label: "Orta",
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      icon: <Minus className="w-3 h-3" />,
    };
  }
  return {
    label: "İyi",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3 h-3" />,
  };
}

export default function TeacherTestsClient({ results, hasStudents }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<TeacherTestResult | null>(null);

  const types: TypeFilter[] = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => r.test?.type && set.add(r.test.type));
    return ["all", ...(Array.from(set) as TestType[])];
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      const matchesType =
        typeFilter === "all" || r.test?.type === typeFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.student?.full_name?.toLowerCase().includes(q) ||
        r.test?.title?.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [results, typeFilter, query]);

  if (!hasStudents) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-10 text-center">
        <HeartPulse className="w-10 h-10 mx-auto text-white/30 mb-2" />
        <p className="text-white/60 font-semibold">Henüz öğrencin yok</p>
        <p className="text-white/40 text-sm mt-1">
          Sana öğrenci atandığında ve testleri çözdüklerinde sonuçlar burada
          listelenecek.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Öğrenci veya test ara..."
            className="pl-9 pr-3 py-2 rounded-lg bg-white/3 border border-white/8 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#7B2FFF]/40 focus:ring-2 focus:ring-[#7B2FFF]/20 w-64"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          {types.map((t) => {
            const meta = t === "all" ? null : typeMeta(t);
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all ${
                  active
                    ? "bg-[#7B2FFF]/15 border-[#7B2FFF]/40 text-[#A78BFF]"
                    : "bg-white/3 border-white/8 text-white/40 hover:text-white hover:border-white/15"
                }`}
                style={
                  meta && active
                    ? {
                        background: `${meta.color}1a`,
                        borderColor: `${meta.color}50`,
                        color: meta.color,
                      }
                    : undefined
                }
              >
                {t === "all" ? "Tümü" : meta?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tablo */}
      <div className="rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-white/60 text-sm font-semibold">
              Eşleşen sonuç bulunamadı
            </p>
            <p className="text-white/30 text-xs mt-1">
              Filtreleri temizleyip tekrar dene.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 border-b border-white/5 bg-white/2">
                  <th className="px-4 py-3 font-bold">Öğrenci</th>
                  <th className="px-4 py-3 font-bold">Test</th>
                  <th className="px-4 py-3 font-bold">Tarih</th>
                  <th className="px-4 py-3 font-bold text-right">Skor</th>
                  <th className="px-4 py-3 font-bold">Durum</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = r.test
                    ? typeMeta(r.test.type as TestType)
                    : typeMeta("general");
                  const risk = riskLevel(r);
                  const date = new Date(r.takenAt);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {initialsFromName(r.student?.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                              {r.student?.full_name ?? "İsimsiz Öğrenci"}
                            </p>
                            {r.student?.grade && (
                              <p className="text-white/40 text-[10px]">
                                {r.student.grade}. sınıf
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-1.5 h-6 rounded-full shrink-0"
                            style={{ background: meta.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {r.test?.title ?? "—"}
                            </p>
                            <p
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: meta.color }}
                            >
                              {meta.label}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {date.toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white font-black tabular-nums">
                          {r.score ?? "—"}
                        </span>
                        {r.test && r.score !== null && (
                          <span className="text-white/30 text-[10px] ml-1">
                            /{scoreRange(r.test.questions).max}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${risk.className}`}
                        >
                          {risk.icon}
                          {risk.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-[#7B2FFF]/15 hover:border-[#7B2FFF]/30 text-xs font-semibold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <DetailModal
        result={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  result,
  onClose,
}: {
  result: TeacherTestResult | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!result) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = orig;
    };
  }, [result, onClose]);

  if (!result || !mounted) return null;

  const test = result.test;
  const meta = test ? typeMeta(test.type as TestType) : typeMeta("general");
  const interp = test
    ? interpretScore(test.questions, result.score ?? 0)
    : null;
  const range = test ? scoreRange(test.questions) : { min: 0, max: 100 };
  const risk = riskLevel(result);
  const pct = test
    ? Math.round(
        (((result.score ?? 0) - range.min) /
          Math.max(1, range.max - range.min)) *
          100
      )
    : 0;

  // Re-calculate score from raw answers (sanity check)
  const recalculated = test
    ? calculateScore(
        test.questions,
        Object.fromEntries(
          Object.entries(result.answers).map(([k, v]) => [Number(k), v])
        )
      )
    : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2FFF] to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 sticky top-0 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                background: `${meta.color}1a`,
                borderColor: `${meta.color}50`,
                color: meta.color,
              }}
            >
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border inline-block"
                style={{
                  background: `${meta.color}14`,
                  borderColor: `${meta.color}40`,
                  color: meta.color,
                }}
              >
                {meta.label}
              </span>
              <p className="text-white text-base font-bold mt-1 truncate">
                {test?.title ?? "Test"}
              </p>
              <p className="text-white/40 text-[11px]">
                {result.student?.full_name ?? "Öğrenci"} ·{" "}
                {new Date(result.takenAt).toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white p-1 transition-colors shrink-0"
            aria-label="Kapat"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Skor + risk */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MiniMetric
              label="Toplam skor"
              value={`${result.score ?? "—"} / ${range.max}`}
              accent={meta.color}
            />
            <MiniMetric
              label="Yorum"
              value={interp?.label ?? "—"}
              accent={meta.color}
            />
            <MiniMetric
              label="Risk durumu"
              value={risk.label}
              accent={
                risk.label === "Dikkat"
                  ? "#F43F5E"
                  : risk.label === "Orta"
                  ? "#F59E0B"
                  : "#10B981"
              }
            />
          </div>

          {/* Skor barı */}
          <div>
            <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
              <span>{range.min}</span>
              <span className="tabular-nums">{pct}%</span>
              <span>{range.max}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${meta.color}, #4F7CFF)`,
                  boxShadow: `0 0 12px ${meta.color}80`,
                }}
              />
            </div>
          </div>

          {/* Yorum */}
          {interp && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                Yorum
              </p>
              <p className="text-white text-sm leading-relaxed">
                {interp.summary}
              </p>
            </div>
          )}

          {/* DORA önerisi */}
          {interp?.doraSuggestion && (
            <div className="relative rounded-xl border border-[#7B2FFF]/25 bg-gradient-to-br from-[#7B2FFF]/10 to-transparent p-4">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#7B2FFF]/20 border border-[#7B2FFF]/30 flex items-center justify-center text-[#A78BFF] shrink-0">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFF] mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    DORA önerisi (öğrenciye gösterilen)
                  </p>
                  <p className="text-white text-sm leading-relaxed">
                    {interp.doraSuggestion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Soru bazında cevaplar */}
          {test && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Soru bazında cevaplar
                </p>
                {recalculated !== null &&
                  result.score !== null &&
                  recalculated === result.score && (
                    <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Skor doğrulandı
                    </span>
                  )}
              </div>
              <ol className="space-y-1.5">
                {test.questions.items.map((item, idx) => {
                  const raw = result.answers[String(item.id)] ?? null;
                  const scaledLabel =
                    raw !== null
                      ? test.questions.scale.labels[
                          raw - test.questions.scale.min
                        ] ?? `${raw}`
                      : "—";
                  return (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="text-white/40 text-[11px] font-bold tabular-nums mr-2">
                          {idx + 1}.
                        </span>
                        <span className="text-white/70 text-xs">
                          {item.text}
                        </span>
                        {item.reverse && (
                          <span className="ml-1.5 text-[9px] font-bold text-amber-300/80">
                            (ters puanlanır)
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-white text-xs font-bold tabular-nums">
                          {raw ?? "—"}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {scaledLabel}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
        {label}
      </p>
      <p
        className="text-base font-black truncate"
        style={{ color: accent }}
      >
        {value}
      </p>
    </div>
  );
}
