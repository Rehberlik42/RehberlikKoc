"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-[#7B2FFF]/25 to-[#4F7CFF]/15 border-[#7B2FFF]/40 text-white shadow-md shadow-[#7B2FFF]/15 scale-[1.02]"
                    : "bg-slate-900/40 border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
                <span
                  className={`tabular-nums text-xs ${
                    active ? "text-[#A78BFF]" : "text-white/30"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:ml-auto w-full sm:w-56">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İçerik ara..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-900/50 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#7B2FFF]/40 focus:ring-2 focus:ring-[#7B2FFF]/20"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-12 text-center">
          <p className="text-white/60 font-semibold">Eşleşen içerik yok</p>
          <p className="text-white/40 text-sm mt-1">
            Filtreyi değiştir veya aramayı temizle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <GuidanceCard
              key={item.id}
              item={item}
              onVideoOpen={setVideoItem}
            />
          ))}
        </div>
      )}
    </>
  );
}
