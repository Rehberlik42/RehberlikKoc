"use client";

import { useState, useEffect } from "react";
import { CheckCheck, AlertCircle } from "lucide-react";
import PdfExportButton from "@/app/dashboard/_components/PdfExportButton";

type ToastState = { type: "info" | "success" | "error"; message: string };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose, toast]);

  const styles =
    toast.type === "success"
      ? "bg-[#0d1f0d] border-green-500/30 text-green-400"
      : toast.type === "error"
      ? "bg-[#1f0d0d] border-red-500/30 text-red-400"
      : "bg-[var(--surface)] border-[var(--primary)]/30 text-[var(--accent)]";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold ${styles}`}
    >
      {toast.type === "error" ? (
        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
      ) : (
        <CheckCheck className="w-4.5 h-4.5 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

export default function ProgramExportBar() {
  const [toast, setToast] = useState<ToastState | null>(null);

  return (
    <>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      <PdfExportButton
        targetId="program-export-root"
        filenamePrefix="mindora-calisma-programi"
        reportTitle="MINDORA Raporu · Çalışma Programı"
        label="Programı İndir"
        onToast={(message, type) => setToast({ message, type })}
      />
    </>
  );
}
