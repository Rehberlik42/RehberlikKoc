"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
      className: "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
      icon: <Minus className="h-3 w-3" />,
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
      icon: <AlertTriangle className="h-3 w-3" />,
    };
  }
  if (isMedium) {
    return {
      label: "Orta",
      className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      icon: <Minus className="h-3 w-3" />,
    };
  }
  return {
    label: "İyi",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: <CheckCircle2 className="h-3 w-3" />,
  };
}

function getEntryAnimation(
  seenIds: Set<number>,
  id: number,
  index: number
): { className: string; style?: React.CSSProperties } {
  const isNew = !seenIds.has(id);
  if (isNew) seenIds.add(id);

  return isNew
    ? {
        className:
          "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300",
        style: { animationDelay: `${Math.min(index * 40, 280)}ms` },
      }
    : { className: "" };
}

function StudentAvatar({
  student,
  size = "md",
}: {
  student: TeacherTestResult["student"];
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs";
  if (student?.avatar_url) {
    return (
      <img
        src={student.avatar_url}
        alt=""
        loading="lazy"
        className={`${dim} shrink-0 rounded-full border border-[var(--border)] object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] font-bold text-[var(--text-primary)]`}
    >
      {initialsFromName(student?.full_name)}
    </div>
  );
}

function StudentIdentity({
  student,
  size = "md",
}: {
  student: TeacherTestResult["student"];
  size?: "sm" | "md";
}) {
  const inner = (
    <>
      <StudentAvatar student={student} size={size} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {student?.full_name ?? "İsimsiz Öğrenci"}
        </p>
        {student?.grade && (
          <p className="text-[10px] text-[var(--text-muted)]">{student.grade}. sınıf</p>
        )}
      </div>
    </>
  );

  if (student?.id) {
    return (
      <Link
        href={`/dashboard/teacher/students/${student.id}`}
        className="group/student flex min-w-0 items-center gap-2.5 rounded-lg transition-colors hover:text-[var(--accent)]"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </Link>
    );
  }

  return <div className="flex min-w-0 items-center gap-2.5">{inner}</div>;
}

function RiskBadge({ risk }: { risk: ReturnType<typeof riskLevel> }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${risk.className}`}
    >
      {risk.icon}
      {risk.label}
    </span>
  );
}

export default function TeacherTestsClient({ results, hasStudents }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<TeacherTestResult | null>(null);
  const seenRowIdsRef = useRef(new Set<number>());

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

  const attentionCount = useMemo(
    () => filtered.filter((r) => riskLevel(r).label === "Dikkat").length,
    [filtered]
  );

  if (!hasStudents) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30 p-10 text-center">
        <HeartPulse className="mx-auto mb-2 h-10 w-10 text-[var(--text-muted)]" />
        <p className="font-semibold text-[var(--text-secondary)]">Henüz öğrencin yok</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sana öğrenci atandığında ve testleri çözdüklerinde sonuçlar burada
          listelenecek.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-3">
        {attentionCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-xs font-semibold text-rose-200">
              {attentionCount} sonuç dikkat gerektiriyor
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Öğrenci veya test ara..."
              className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            {types.map((t) => {
              const meta = t === "all" ? null : typeMeta(t);
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    active
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
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
      </div>

      {/* Sonuç listesi */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">
              Eşleşen sonuç bulunamadı
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Filtreleri temizleyip tekrar dene.
            </p>
          </div>
        ) : (
          <>
            {/* Masaüstü tablo */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-white/[0.02] text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <th className="px-4 py-3">Öğrenci</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3 text-right">Skor</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, index) => {
                    const meta = r.test
                      ? typeMeta(r.test.type as TestType)
                      : typeMeta("general");
                    const risk = riskLevel(r);
                    const isAttention = risk.label === "Dikkat";
                    const date = new Date(r.takenAt);
                    const anim = getEntryAnimation(
                      seenRowIdsRef.current,
                      r.id,
                      index
                    );

                    return (
                      <tr
                        key={r.id}
                        className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] ${
                          isAttention
                            ? "border-l-2 border-l-rose-500/50 bg-rose-500/[0.03]"
                            : ""
                        } ${anim.className}`}
                        style={anim.style}
                      >
                        <td className="px-4 py-3">
                          <StudentIdentity student={r.student} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-6 w-1.5 shrink-0 rounded-full"
                              style={{ background: meta.color }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
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
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {date.toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black tabular-nums text-[var(--text-primary)]">
                            {r.score ?? "—"}
                          </span>
                          {r.test && r.score !== null && (
                            <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                              /{scoreRange(r.test.questions).max}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge risk={risk} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/15 hover:text-[var(--text-primary)]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil kartlar */}
            <div className="divide-y divide-white/5 md:hidden">
              {filtered.map((r, index) => {
                const meta = r.test
                  ? typeMeta(r.test.type as TestType)
                  : typeMeta("general");
                const risk = riskLevel(r);
                const isAttention = risk.label === "Dikkat";
                const date = new Date(r.takenAt);
                const anim = getEntryAnimation(
                  seenRowIdsRef.current,
                  r.id,
                  index
                );

                return (
                  <div
                    key={r.id}
                    className={`space-y-3 p-4 ${
                      isAttention
                        ? "border-l-2 border-l-rose-500/50 bg-rose-500/[0.03]"
                        : ""
                    } ${anim.className}`}
                    style={anim.style}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <StudentIdentity student={r.student} size="sm" />
                      <RiskBadge risk={risk} />
                    </div>

                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-5 w-1 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
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

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-[var(--text-muted)]">
                        {date.toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-sm">
                        <span className="font-black tabular-nums text-[var(--text-primary)]">
                          {r.score ?? "—"}
                        </span>
                        {r.test && r.score !== null && (
                          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                            /{scoreRange(r.test.questions).max}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/15 hover:text-[var(--text-primary)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detay
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <DetailModal result={selected} onClose={() => setSelected(null)} />
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
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-2xl animate-in fade-in zoom-in-95 overflow-y-auto rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/25 duration-300 slide-in-from-bottom-2">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-[80px]"
          style={{
            background:
              "radial-gradient(circle, rgba(123,47,255,0.45) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              style={{
                background: `${meta.color}1a`,
                borderColor: `${meta.color}50`,
                color: meta.color,
              }}
            >
              <HeartPulse className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span
                className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: `${meta.color}14`,
                  borderColor: `${meta.color}40`,
                  color: meta.color,
                }}
              >
                {meta.label}
              </span>
              <p className="mt-1 truncate text-base font-bold text-[var(--text-primary)]">
                {test?.title ?? "Test"}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {result.student?.full_name ?? "Öğrenci"} ·{" "}
                {new Date(result.takenAt).toLocaleString("tr-TR")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Kapat"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <div>
            <div className="mb-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>{range.min}</span>
              <span className="tabular-nums">{pct}%</span>
              <span>{range.max}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
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

          {interp && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Yorum
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                {interp.summary}
              </p>
            </div>
          )}

          {interp?.doraSuggestion && (
            <div className="relative rounded-xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/10 to-transparent p-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/20 text-[var(--accent)]">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                    <Sparkles className="h-3 w-3" />
                    DORA önerisi (öğrenciye gösterilen)
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                    {interp.doraSuggestion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {test && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Soru bazında cevaplar
                </p>
                {recalculated !== null &&
                  result.score !== null &&
                  recalculated === result.score && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
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
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-white/[0.02] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="mr-2 text-[11px] font-bold tabular-nums text-[var(--text-muted)]">
                          {idx + 1}.
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {item.text}
                        </span>
                        {item.reverse && (
                          <span className="ml-1.5 text-[9px] font-bold text-amber-300/80">
                            (ters puanlanır)
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
                          {raw ?? "—"}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="truncate text-base font-black" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
