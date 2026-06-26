"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import type { GuidanceContent, GuidanceFilter } from "@/lib/guidance";
import { FILTER_CHIPS } from "@/lib/guidance";
import GuidanceCard from "./GuidanceCard";
import VideoModal from "./VideoModal";

interface Props {
  initialContents: GuidanceContent[];
}

export default function GuidanceHub({ initialContents }: Props) {
  const [filter, setFilter] = useState<GuidanceFilter>("all");
  const [query, setQuery] = useState("");
  const [videoItem, setVideoItem] = useState<GuidanceContent | null>(null);
  const seenCardIds = useRef(new Set<number>());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialContents.filter((c) => {
      const matchesType = filter === "all" || c.content_type === filter;
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false);
      return matchesType && matchesQuery;
    });
  }, [initialContents, filter, query]);

  const counts = useMemo(() => {
    const all = initialContents.length;
    const blog = initialContents.filter((c) => c.content_type === "blog").length;
    const video = initialContents.filter((c) => c.content_type === "video").length;
    const pdf = initialContents.filter((c) => c.content_type === "pdf").length;
    return { all, blog, video, pdf };
  }, [initialContents]);

  return (
    <>
      <VideoModal item={videoItem} onClose={() => setVideoItem(null)} />

      {/* Kategori filtreleri — Pinterest / Netflix tarzı chip şeridi */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.id;
            const count =
              chip.id === "all"
                ? counts.all
                : counts[chip.id as keyof typeof counts];
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ease-out ${
                  active
                    ? "scale-[1.02] border-[var(--primary)]/40 bg-gradient-to-r from-[var(--primary)]/25 to-[var(--primary-2)]/15 text-[var(--text-primary)] shadow-md shadow-[var(--primary)]/15"
                    : "border-[var(--border)] bg-[var(--surface)]/40 text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
                <span
                  className={`text-xs tabular-nums ${
                    active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:ml-auto sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İçerik ara..."
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)]/50 py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all duration-200 focus:border-[var(--primary)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/20 bg-gradient-to-br from-slate-900/40 to-[var(--surface)]/30 p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <p className="font-semibold text-[var(--text-secondary)]">Eşleşen içerik yok</p>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Farklı bir kategori dene veya aramayı temizle — tüm içerikler burada
            keşfedilmeyi bekliyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, index) => {
            const shouldAnimate = !seenCardIds.current.has(item.id);
            seenCardIds.current.add(item.id);

            return (
              <div
                key={item.id}
                className={
                  shouldAnimate
                    ? "animate-in fade-in fill-mode-both duration-300"
                    : undefined
                }
                style={
                  shouldAnimate
                    ? { animationDelay: `${Math.min(index * 30, 240)}ms` }
                    : undefined
                }
              >
                <GuidanceCard item={item} onVideoOpen={setVideoItem} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
