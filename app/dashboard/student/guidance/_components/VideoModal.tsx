"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, PlayCircle } from "lucide-react";
import type { GuidanceContent } from "@/lib/guidance";
import { toEmbedUrl } from "@/lib/guidance";

interface Props {
  item: GuidanceContent | null;
  onClose: () => void;
}

export default function VideoModal({ item, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = orig;
    };
  }, [item, onClose]);

  if (!item || !mounted) return null;

  const embed = toEmbedUrl(item.url);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 animate-in fade-in duration-300 bg-black/90 backdrop-blur-md"
      />

      <div className="relative w-full max-w-5xl animate-in fade-in zoom-in-95 fill-mode-both overflow-hidden rounded-2xl border border-[#7B2FFF]/20 bg-[#07070f] shadow-2xl shadow-[#7B2FFF]/25 duration-300">
        {/* Minimal başlık */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0d0d2b]/80 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <PlayCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="truncate text-sm font-semibold text-white/90">
              {item.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Videoyu kapat"
            className="shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sinema alanı */}
        <div className="bg-black p-1 sm:p-2">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
            {embed ? (
              <iframe
                src={embed}
                title={item.title}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <PlayCircle className="h-10 w-10 text-white/20" />
                <p className="text-sm text-white/45">
                  Video bağlantısı bulunamadı.
                </p>
              </div>
            )}
          </div>
        </div>

        {item.description && (
          <p className="border-t border-white/[0.06] px-4 py-2.5 text-xs leading-relaxed text-white/45 sm:text-sm">
            {item.description}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
