"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { SaasClient } from "@/lib/superadmin/types";
import { deleteClientRecord } from "../actions";

interface DeleteClientModalProps {
  client: SaasClient;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteClientModal({
  client,
  onClose,
  onSuccess,
}: DeleteClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteClientRecord(client.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSuccess();
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-xl border border-red-500/20 bg-[#0f0f23] shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-red-500/20 px-6 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <h2 className="text-lg font-bold text-white">Müşteriyi Sil?</h2>
          </div>

          <div className="space-y-3 px-6 py-4">
            <p className="text-sm text-white/70">
              <strong>&quot;{client.company_name}&quot;</strong> kaydı silinecek.
            </p>
            <p className="text-xs text-white/50">
              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
            </p>
            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-lg bg-red-600/80 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
