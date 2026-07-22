"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BookX,
  Check,
  Clock,
  Flame,
  RotateCcw,
  X,
} from "lucide-react";
import { submitMistakeReview } from "@/app/dashboard/_actions/mistake-review";
import AppToaster from "@/app/dashboard/_components/AppToaster";
import { toISODate } from "@/app/dashboard/student/program/_components/plan-shared";

export interface TodayMistakeEntry {
  id: number;
  subject_id: number;
  topic_id: number | null;
  resource_label: string | null;
  test_label: string | null;
  question_number: string | null;
  cause_type: "dikkatsizlik" | "bilgi_eksigi";
  solved_date: string;
  next_review_date: string;
  stage: number;
  subjectName: string | null;
  topicName: string | null;
  activeReviewId: number | null;
}

export interface MistakeCounters {
  bugunBekleyen: number;
  gecikmis: number;
  buHaftaTamamlanan: number;
  aktifKirmizi: number;
  aktifSari: number;
  kaliciOgrenilen: number;
}

interface Props {
  entries: TodayMistakeEntry[];
  counters: MistakeCounters;
}

type ConvertModalState = {
  entryId: number;
  reviewId: number;
  step: "ask" | "note";
  reflectionNote: string;
};

function CounterChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "amber" | "rose" | "emerald" | "sky";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2 ${tones[tone]}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

export default function TodayMistakesCard({ entries, counters }: Props) {
  const todayStr = useMemo(() => toISODate(new Date()), []);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ConvertModalState | null>(null);
  const [, startTransition] = useTransition();

  const list = useMemo(
    () => entries.filter((e) => !hiddenIds.has(e.id)),
    [entries, hiddenIds]
  );

  const runReview = (
    entryId: number,
    reviewId: number,
    result: "dogru" | "yanlis",
    extra?: { convertToBilgiEksigi?: boolean; reflectionNote?: string }
  ) => {
    setPendingIds((prev) => new Set(prev).add(entryId));
    setHiddenIds((prev) => new Set(prev).add(entryId));

    startTransition(async () => {
      const res = await submitMistakeReview({
        entryId,
        reviewId,
        result,
        ...extra,
      });

      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });

      if (!res.success) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
        toast.error(res.error ?? "İşlem başarısız");
        return;
      }

      toast.success(
        result === "dogru" ? "Harika, doğru yaptın!" : "Tekrar planlandı (+21 gün)"
      );
    });
  };

  const handleDogru = (entry: TodayMistakeEntry) => {
    if (!entry.activeReviewId) {
      toast.error("Aktif tekrar kaydı bulunamadı.");
      return;
    }
    runReview(entry.id, entry.activeReviewId, "dogru");
  };

  const handleYanlis = (entry: TodayMistakeEntry) => {
    if (!entry.activeReviewId) {
      toast.error("Aktif tekrar kaydı bulunamadı.");
      return;
    }

    if (entry.cause_type === "bilgi_eksigi") {
      runReview(entry.id, entry.activeReviewId, "yanlis");
      return;
    }

    setModal({
      entryId: entry.id,
      reviewId: entry.activeReviewId,
      step: "ask",
      reflectionNote: "",
    });
  };

  const confirmConvertNo = () => {
    if (!modal) return;
    const { entryId, reviewId } = modal;
    setModal(null);
    runReview(entryId, reviewId, "yanlis", { convertToBilgiEksigi: false });
  };

  const confirmConvertYes = () => {
    if (!modal) return;
    if (modal.step === "ask") {
      setModal({ ...modal, step: "note" });
      return;
    }
    if (!modal.reflectionNote.trim()) {
      toast.error("Not yazmadan onaylanamaz.");
      return;
    }
    const { entryId, reviewId, reflectionNote } = modal;
    setModal(null);
    runReview(entryId, reviewId, "yanlis", {
      convertToBilgiEksigi: true,
      reflectionNote: reflectionNote.trim(),
    });
  };

  return (
    <>
      <AppToaster />
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <BookX className="h-4.5 w-4.5 text-[var(--accent)]" />
              Bugün Tekrar Edilecekler
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Zamanı gelen veya gecikmiş yanlış soruların
            </p>
          </div>
          {(counters.bugunBekleyen > 0 || counters.gecikmis > 0) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              <Flame className="h-3 w-3" />
              {counters.bugunBekleyen + counters.gecikmis} bekliyor
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <CounterChip label="Bugün bekleyen" value={counters.bugunBekleyen} tone="sky" />
          <CounterChip label="Gecikmiş" value={counters.gecikmis} tone="amber" />
          <CounterChip
            label="Bu hafta tamamlanan"
            value={counters.buHaftaTamamlanan}
            tone="emerald"
          />
          <CounterChip label="Aktif kırmızı" value={counters.aktifKirmizi} tone="rose" />
          <CounterChip label="Aktif sarı" value={counters.aktifSari} tone="amber" />
          <CounterChip
            label="Kalıcı öğrenilen"
            value={counters.kaliciOgrenilen}
            tone="emerald"
          />
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-8 text-center">
            <Check className="mx-auto h-8 w-8 text-emerald-400/80" />
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
              Bugün tekrar edecek soru yok
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Harika — ya hepsini hallettin ya da henüz planlanmış tekrar yok.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((entry) => {
              const isOverdue = entry.next_review_date < todayStr;
              const isBilgi = entry.cause_type === "bilgi_eksigi";
              const busy = pendingIds.has(entry.id);

              const meta = [
                entry.subjectName,
                entry.topicName,
                entry.resource_label,
                entry.test_label,
                entry.question_number ? `Soru ${entry.question_number}` : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={entry.id}
                  className={`rounded-xl border px-3 py-3 sm:px-4 ${
                    isOverdue
                      ? "border-amber-500/35 bg-amber-500/5"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            isBilgi
                              ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                              : "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isBilgi ? "bg-rose-400" : "bg-amber-400"
                            }`}
                          />
                          {isBilgi ? "Bilgi eksiği" : "Dikkatsizlik"}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            Gecikmiş
                          </span>
                        )}
                        {isBilgi && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
                            <RotateCcw className="h-3 w-3" />
                            Aşama {entry.stage + 1}/2
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <Clock className="h-3 w-3" />
                          {entry.next_review_date}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {meta || "Soru kaydı"}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busy || !entry.activeReviewId}
                        onClick={() => handleDogru(entry)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Doğru Yaptım
                      </button>
                      <button
                        type="button"
                        disabled={busy || !entry.activeReviewId}
                        onClick={() => handleYanlis(entry)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500/20 px-3 py-2 text-xs font-bold text-rose-200 ring-1 ring-rose-500/30 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                      >
                        <X className="h-3.5 w-3.5" />
                        Yanlış Yaptım
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mistake-convert-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <h4
              id="mistake-convert-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              {modal.step === "ask"
                ? "Yeniden sınıflandırılsın mı?"
                : "Bu sorudan ne öğrendim?"}
            </h4>

            {modal.step === "ask" ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Bu soru tekrar yanlış yapıldı. Bilgi eksiği olarak yeniden
                sınıflandırılsın mı?
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-[var(--text-muted)]">
                  Not yazılmadan tekrar takvimi başlamaz.
                </p>
                <textarea
                  value={modal.reflectionNote}
                  onChange={(e) =>
                    setModal({ ...modal, reflectionNote: e.target.value })
                  }
                  rows={3}
                  autoFocus
                  placeholder="Kısa bir not yaz…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                />
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {modal.step === "ask" ? (
                <>
                  <button
                    type="button"
                    onClick={confirmConvertNo}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-opacity hover:opacity-90"
                  >
                    Hayır
                  </button>
                  <button
                    type="button"
                    onClick={confirmConvertYes}
                    className="rounded-xl bg-rose-500/25 px-4 py-2 text-sm font-bold text-rose-100 ring-1 ring-rose-400/40 transition-opacity hover:opacity-90"
                  >
                    Evet
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setModal({ ...modal, step: "ask" })}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    disabled={!modal.reflectionNote.trim()}
                    onClick={confirmConvertYes}
                    className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Onayla
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
