"use client";

import { useCallback } from "react";
import Image from "next/image";
import {
  PlayCircle,
  BookOpen,
  FileText,
  Globe,
  ExternalLink,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ResourceItem, ResourceType } from "./RecommendationsClient";

// ─── Type meta ────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  ResourceType,
  {
    label: string;
    icon: React.ReactNode;
    accent: string;
    glow: string;
    cta: string;
  }
> = {
  youtube: {
    label: "Video",
    icon: <PlayCircle className="w-3.5 h-3.5" />,
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.4)",
    cta: "İzle",
  },
  book: {
    label: "Kitap",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    accent: "#7B2FFF",
    glow: "rgba(123,47,255,0.45)",
    cta: "İncele",
  },
  document: {
    label: "PDF",
    icon: <FileText className="w-3.5 h-3.5" />,
    accent: "#4F7CFF",
    glow: "rgba(79,124,255,0.4)",
    cta: "Aç",
  },
  website: {
    label: "Site",
    icon: <Globe className="w-3.5 h-3.5" />,
    accent: "#00D4FF",
    glow: "rgba(0,212,255,0.4)",
    cta: "Ziyaret Et",
  },
};

// ─── ResourceCard ─────────────────────────────────────────────────────────────
export default function ResourceCard({ resource }: { resource: ResourceItem }) {
  const supabase = createClient();
  const meta = TYPE_CONFIG[resource.type];

  // View count artirma (best-effort, hata umursanmiyor)
  const handleClick = useCallback(async () => {
    try {
      await supabase
        .from("resources")
        .update({ view_count: resource.view_count + 1 })
        .eq("id", resource.id);
    } catch {
      // ignore
    }
  }, [supabase, resource.id, resource.view_count]);

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="group relative flex animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex-col overflow-hidden rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:border-transparent motion-reduce:animate-none"
      style={{
        boxShadow: undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 10px 32px -8px ${meta.glow}, 0 0 0 1px ${meta.accent}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Thumbnail / Icon area */}
      <div
        className="relative flex h-32 items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}25, ${meta.accent}08)`,
        }}
      >
        {resource.thumbnail_url ? (
          <Image
            src={resource.thumbnail_url}
            alt={resource.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-90 transition-all duration-500 group-hover:scale-[1.05] group-hover:opacity-100"
            unoptimized
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border"
            style={{
              background: `linear-gradient(135deg, ${meta.accent}40, ${meta.accent}10)`,
              borderColor: `${meta.accent}40`,
            }}
          >
            <span style={{ color: meta.accent }} className="scale-150">
              {meta.icon}
            </span>
          </div>
        )}

        {/* Dark overlay for readable badge */}
        {resource.thumbnail_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#07071a]/90 via-[#07071a]/20 to-transparent" />
        )}

        {/* Type badge top-left */}
        <div
          className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md"
          style={{
            background: `${meta.accent}30`,
            border: `1px solid ${meta.accent}60`,
            color: meta.accent,
          }}
        >
          {meta.icon}
          {meta.label}
        </div>

        {/* Play overlay for youtube */}
        {resource.type === "youtube" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/50 bg-red-500/30 shadow-lg shadow-red-500/20 backdrop-blur-md">
              <PlayCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Subject & Topic badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {resource.subject && (
            <span
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: `${resource.subject.color ?? "#4F7CFF"}15`,
                borderColor: `${resource.subject.color ?? "#4F7CFF"}40`,
                color: resource.subject.color ?? "#7AB3FF",
              }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: resource.subject.color ?? "#4F7CFF" }}
              />
              {resource.subject.name}
            </span>
          )}
          {resource.subject?.exam && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
              {resource.subject.exam.name}
            </span>
          )}
          {resource.topic && (
            <span className="max-w-[120px] truncate text-[10px] font-semibold text-white/40">
              · {resource.topic.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-white">
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-white/45">
            {resource.description}
          </p>
        )}

        {/* Footer: viewCount + CTA */}
        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-white/30">
            <Eye className="h-3 w-3" />
            {resource.view_count > 0 ? resource.view_count : "yeni"}
          </div>
          <div
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 group-hover:gap-2"
            style={{
              background: `linear-gradient(135deg, ${meta.accent}25, ${meta.accent}10)`,
              border: `1px solid ${meta.accent}55`,
              color: meta.accent,
            }}
          >
            {meta.cta}
            <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:rotate-45" />
          </div>
        </div>
      </div>

      {/* External link icon top-right (always visible, subtle) */}
      <ExternalLink className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-white/40 transition-colors group-hover:text-white" />
    </a>
  );
}
