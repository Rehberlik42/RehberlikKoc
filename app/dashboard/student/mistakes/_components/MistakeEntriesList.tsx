"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import type { MistakeCauseType } from "./mistake-types";

export interface MistakeListEntry {
  id: number;
  subjectName: string | null;
  topicName: string | null;
  resourceLabel: string | null;
  testLabel: string | null;
  questionNumber: string | null;
  causeType: MistakeCauseType;
  status: "aktif" | "tamamlandi";
  solvedDate: string;
  createdAt: string;
}

type FilterId = "all" | "aktif_kirmizi" | "aktif_sari" | "tamamlanan";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "aktif_kirmizi", label: "Aktif Kırmızı" },
  { id: "aktif_sari", label: "Aktif Sarı" },
  { id: "tamamlanan", label: "Tamamlanan" },
];

function formatShortDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function matchesFilter(entry: MistakeListEntry, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "aktif_kirmizi") {
    return entry.status === "aktif" && entry.causeType === "bilgi_eksigi";
  }
  if (filter === "aktif_sari") {
    return entry.status === "aktif" && entry.causeType === "dikkatsizlik";
  }
  return entry.status === "tamamlandi";
}

interface Props {
  entries: MistakeListEntry[];
}

export default function MistakeEntriesList({ entries }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(
    () => entries.filter((e) => matchesFilter(e, filter)),
    [entries, filter]
  );

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
          Kayıtlar
        </p>
        <h3 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
          Tüm sorular
        </h3>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Filtrele, satıra tıklayarak detay ve tarihçeyi gör.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "bg-[var(--primary)]/25 text-[var(--accent)] ring-1 ring-[var(--primary)]/40"
                  : "bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            Henüz hiç soru kaydetmedin
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Yukarıdaki formdan ilk yanlışlarını ekleyebilirsin.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
          Bu filtrede kayıt yok.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
          {filtered.map((entry) => {
            const isBilgi = entry.causeType === "bilgi_eksigi";
            const isDone = entry.status === "tamamlandi";
            const meta = [
              entry.resourceLabel,
              entry.testLabel,
              entry.questionNumber ? `Soru ${entry.questionNumber}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/student/mistakes/${entry.id}`)
                  }
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--surface-2)]/60 sm:px-4"
                >
                  <span
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      isBilgi ? "bg-rose-400" : "bg-amber-400"
                    }`}
                    title={isBilgi ? "Bilgi eksiği" : "Dikkatsizlik"}
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {entry.subjectName ?? "Ders"}
                        {entry.topicName ? (
                          <span className="font-normal text-[var(--text-secondary)]">
                            {" "}
                            · {entry.topicName}
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isDone
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                            : isBilgi
                              ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30"
                              : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Tamamlandı
                          </>
                        ) : isBilgi ? (
                          "Aktif · Kırmızı"
                        ) : (
                          "Aktif · Sarı"
                        )}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {meta || "Kaynak / test bilgisi yok"}
                      <span className="mx-1.5 text-[var(--border)]">·</span>
                      İlk kayıt: {formatShortDate(entry.solvedDate)}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
