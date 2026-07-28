"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Archive, Loader2, X } from "lucide-react";
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
      .update({ is_active: false })
      .eq("id", resource.id);

    setLoading(false);

    if (error) {
      onError("Kaynak pasif yapılamadı: " + error.message);
      return;
    }

    onDeleted(resource.id);
    onClose();
  };

  if (!open || !mounted || !resource) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl duration-200"
      >
        <div className="flex items-center justify-between border-b border-amber-500/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Kaynağı Pasif Yap?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">&quot;{resource.name}&quot;</span>{" "}
            listelerden kaldırılıp pasif yapılacak.
          </p>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Geçmiş veriler kaybolmaz: kaynak ve konuları veritabanında kalır,
            programdaki bağlı görevler ile öğrencilerin girdiği çözüm verileri
            korunur. Kaynak yalnızca koç ve öğrenci listelerinde görünmez olur.
          </p>
        </div>

        <div className="flex gap-3 border-t border-[var(--border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600/90 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Pasif Yap
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
