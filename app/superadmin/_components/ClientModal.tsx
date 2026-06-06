"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { SaasClient } from "@/lib/superadmin/types";
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_LABELS,
} from "@/lib/superadmin/constants";
import { createClientRecord, updateClientRecord } from "../actions";

interface ClientModalProps {
  isOpen: boolean;
  editingClient: SaasClient | null;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = {
  company_name: "",
  contact_name: "",
  max_students: "50",
  subscription_status: "trial",
  expires_at: "",
};

export default function ClientModal({
  isOpen,
  editingClient,
  onClose,
  onSuccess,
}: ClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingClient) {
      setForm({
        company_name: editingClient.company_name,
        contact_name: editingClient.contact_name,
        max_students: String(editingClient.max_students),
        subscription_status: editingClient.subscription_status,
        expires_at: editingClient.expires_at
          ? editingClient.expires_at.slice(0, 10)
          : "",
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (editingClient) {
      formData.set("id", editingClient.id);
    }

    startTransition(async () => {
      const result = editingClient
        ? await updateClientRecord(formData)
        : await createClientRecord(formData);

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
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#0f0f23] shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-[#0f0f23]/95 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              {editingClient ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Kurum / Kişi Adı *
              </label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company_name: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white placeholder:text-white/30 focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
                placeholder="Okul veya kurum adı"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                İletişim Kişisi *
              </label>
              <input
                name="contact_name"
                value={form.contact_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contact_name: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white placeholder:text-white/30 focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
                placeholder="Ad Soyad"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Öğrenci Kotası *
              </label>
              <input
                name="max_students"
                type="number"
                min={0}
                value={form.max_students}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, max_students: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Abonelik Tipi *
              </label>
              <select
                name="subscription_status"
                value={form.subscription_status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    subscription_status: e.target.value,
                  }))
                }
                className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
              >
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SUBSCRIPTION_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Bitiş Tarihi
              </label>
              <input
                name="expires_at"
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none focus:ring-1 focus:ring-[#7B2FFF]/30"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] px-4 py-2 font-medium text-white transition-all hover:shadow-lg hover:shadow-[#7B2FFF]/30 disabled:opacity-50"
              >
                {isPending ? "Kaydediliyor..." : editingClient ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
