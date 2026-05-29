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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2 min-w-0">
            <PlayCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-white font-bold text-sm truncate">{item.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={item.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
              Video bağlantısı bulunamadı.
            </div>
          )}
        </div>

        {item.description && (
          <p className="px-4 py-3 text-white/50 text-sm border-t border-white/5">
            {item.description}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
