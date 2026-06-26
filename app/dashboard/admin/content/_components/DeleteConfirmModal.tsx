"use client";

import { useState } from "react";
import { GuidanceContent } from "@/lib/guidance";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DeleteConfirmModalProps {
  content: GuidanceContent;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  content,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("guidance_contents")
        .delete()
        .eq("id", content.id);

      if (deleteError) throw deleteError;

      onConfirm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Silme işlemi başarısız oldu.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="
            bg-[#0f0f23] border border-red-500/20 rounded-xl shadow-2xl shadow-black/50
            w-full max-w-sm
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              İçeriği Sil?
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-3">
            <p className="text-[var(--text-secondary)] text-sm">
              <strong>"{content.title}"</strong> başlıklı içerik silinecek.
            </p>
            <p className="text-[var(--text-secondary)] text-xs">
              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
            </p>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
            <button
              onClick={onCancel}
              disabled={loading}
              className="
                px-4 py-2 rounded-lg
                bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)]
                hover:bg-white/10 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              İptal
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="
                px-4 py-2 rounded-lg
                bg-red-600/80 text-[var(--text-primary)] font-medium
                hover:bg-red-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
