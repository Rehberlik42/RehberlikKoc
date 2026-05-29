"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  PlayCircle,
  FileText,
  ArrowUpRight,
  Download,
} from "lucide-react";
import type { GuidanceContent, GuidanceContentType } from "@/lib/guidance";
import {
  examBadgeLabel,
  fallbackCoverStyle,
  typeMeta,
} from "@/lib/guidance";

const TYPE_ICONS: Record<
  GuidanceContentType,
  React.ComponentType<{ className?: string }>
> = {
  blog: BookOpen,
  video: PlayCircle,
  pdf: FileText,
};

interface Props {
  item: GuidanceContent;
  onVideoOpen: (item: GuidanceContent) => void;
}

export default function GuidanceCard({ item, onVideoOpen }: Props) {
  const meta = typeMeta(item.content_type);
  const Icon = TYPE_ICONS[item.content_type];
  const exam = examBadgeLabel(item.target_exam);

  const handleAction = () => {
    if (item.content_type === "video") {
      onVideoOpen(item);
    }
  };

  const ctaInner = (
    <>
      {item.content_type === "pdf" ? (
        <Download className="w-3.5 h-3.5" />
      ) : (
        <ArrowUpRight className="w-3.5 h-3.5" />
      )}
      {meta.cta}
    </>
  );

  const ctaClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all " +
    "bg-white/5 border-white/10 text-white hover:scale-[1.02] active:scale-100";

  const ctaStyle = {
    borderColor: `${meta.accent}40`,
    boxShadow: `0 0 12px ${meta.glow}`,
  } as React.CSSProperties;

  return (
    <article className="group relative rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md overflow-hidden hover:border-white/15 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      {/* Kapak */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0d0d2b]">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div
            className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
            style={{ background: fallbackCoverStyle(item.content_type) }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-[#07070f]/60 to-transparent" />
        <div
          className="absolute top-3 right-3 w-9 h-9 rounded-xl border flex items-center justify-center backdrop-blur-md"
          style={{
            background: `${meta.accent}22`,
            borderColor: `${meta.accent}55`,
            color: meta.accent,
            boxShadow: `0 0 16px ${meta.glow}`,
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        {exam && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold">
            {exam}
          </span>
        )}
        {item.content_type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center opacity-90 group-hover:scale-110 transition-transform"
              style={{
                borderColor: meta.accent,
                background: `${meta.accent}30`,
                color: meta.accent,
              }}
            >
              <PlayCircle className="w-7 h-7" />
            </div>
          </div>
        )}
      </div>

      {/* Metin */}
      <div className="p-4">
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: meta.accent }}
        >
          {meta.label}
        </p>
        <h3 className="text-white text-base font-bold leading-snug line-clamp-2 group-hover:text-[#A78BFF] transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-white/40 text-xs mt-2 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-white/5">
          {item.content_type === "blog" && (
            <Link
              href={`/dashboard/student/guidance/${item.id}`}
              className={ctaClass}
              style={ctaStyle}
            >
              {ctaInner}
            </Link>
          )}
          {item.content_type === "video" && (
            <button
              type="button"
              onClick={handleAction}
              className={ctaClass}
              style={ctaStyle}
            >
              {ctaInner}
            </button>
          )}
          {item.content_type === "pdf" && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={ctaClass}
              style={ctaStyle}
            >
              {ctaInner}
            </a>
          )}
        </div>
      </div>

      {/* Alt neon çizgi */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${meta.accent}, transparent)`,
        }}
      />
    </article>
  );
}
