"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportElementToPdf } from "@/lib/pdf-export";

interface Props {
  /** Hedef div'in id'si (ornegin mock-exams-export-root) */
  targetId: string;
  filenamePrefix?: string;
  reportTitle?: string;
  label?: string;
  onToast?: (message: string, type: "info" | "success" | "error") => void;
}

export default function PdfExportButton({
  targetId,
  filenamePrefix = "MINDORA-Raporu",
  reportTitle = "MINDORA Raporu",
  label = "PDF Olarak İndir",
  onToast,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    onToast?.("PDF hazırlanıyor...", "info");

    try {
      await exportElementToPdf(targetId, { filenamePrefix, reportTitle });
      onToast?.("PDF başarıyla indirildi.", "success");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "PDF oluşturulamadı.";
      onToast?.(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [targetId, filenamePrefix, reportTitle, onToast]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="pdf-export-hide print-hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7B2FFF]/20 to-[#4F7CFF]/15 border border-[#7B2FFF]/35 text-white text-sm font-semibold shadow-md shadow-[#7B2FFF]/15 hover:border-[#7B2FFF]/50 hover:shadow-[#7B2FFF]/25 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#A78BFF]" />
      ) : (
        <Download className="w-4 h-4 text-[#A78BFF]" />
      )}
      {loading ? "Hazırlanıyor…" : label}
    </button>
  );
}
