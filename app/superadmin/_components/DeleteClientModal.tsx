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
      if ("error" in result) {
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
        className="fixed inset-0 z-40 bg-[#161a3a]/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl border border-red-200 bg-white shadow-2xl shadow-[#161a3a]/15"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-red-100 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-[#161a3a]">Müşteriyi Sil?</h2>
          </div>

          <div className="space-y-3 px-6 py-4">
            <p className="text-sm text-[#5a628c]">
              <strong className="text-[#161a3a]">&quot;{client.company_name}&quot;</strong>{" "}
              kaydı silinecek.
            </p>
            <p className="text-xs text-[#8b93b8]">
              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
            </p>
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-[#eef0f8] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-[#d9def0] bg-white px-4 py-2 text-sm font-medium text-[#5a628c] transition-colors hover:bg-[#f0f2fb] disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Siliniyor..." : "Sil"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
