"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StudyResource } from "./resource-types";

interface Props {
  open: boolean;
  resource: StudyResource | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
}

export default function DeleteResourceModal({
  open,
  resource,
  onClose,
  onDeleted,
  onError,
}: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  const handleDelete = async () => {
    if (!resource) return;

    setLoading(true);
    const { error } = await supabase
      .from("study_resources")
      .delete()
      .eq("id", resource.id);

    setLoading(false);

    if (error) {
      onError("Kaynak silinemedi: " + error.message);
      return;
    }

    onDeleted(resource.id);
    onClose();
  };

  if (!open || !mounted || !resource) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-red-500/25 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl duration-200"
      >
        <div className="flex items-center justify-between border-b border-red-500/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <h2 className="text-base font-bold text-white">Kaynağı Sil?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/8 bg-white/[0.04] p-2 text-white/40 transition-colors hover:text-white"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-white/75">
            <span className="font-semibold text-white">&quot;{resource.name}&quot;</span>{" "}
            silinecek. Bu kaynağın konuları da silinir.
          </p>
          <p className="text-xs leading-relaxed text-white/45">
            Programdaki bağlı görevler silinmez; yalnızca kaynak ve konu bağlantıları
            kalkar. Öğrencilerin girdiği çözüm verileri görev kaydında korunur.
          </p>
        </div>

        <div className="flex gap-3 border-t border-white/8 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600/90 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Sil
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
