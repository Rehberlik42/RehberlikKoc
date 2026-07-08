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
  email: "",
  phone: "",
  password: "",
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
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingClient) {
      setForm({
        company_name: editingClient.company_name,
        contact_name: editingClient.contact_name,
        email: editingClient.email ?? "",
        phone: editingClient.phone ?? "",
        password: "",
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
    setToast(null);
  }, [editingClient, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingClient);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setToast(null);

    const formData = new FormData(e.currentTarget);
    if (editingClient) {
      formData.set("id", editingClient.id);
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateClientRecord(formData)
        : await createClientRecord(formData);

      if ("error" in result) {
        setError(result.error);
        setToast({ message: result.error, type: "error" });
        return;
      }

      router.refresh();

      const successMessage =
        result.message ??
        (isEditing
          ? "Müşteri bilgileri güncellendi."
          : "Müşteri başarıyla oluşturuldu.");

      setToast({ message: successMessage, type: "success" });

      setTimeout(() => {
        onSuccess();
        setToast(null);
      }, 1500);
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
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d9def0] bg-white shadow-2xl shadow-[#161a3a]/15"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-[#d9def0] bg-white/95 px-6 py-4 backdrop-blur-sm">
            <div>
              <h2 className="text-xl font-bold text-[#161a3a]">
                {isEditing ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
              </h2>
              {!isEditing ? (
                <p className="mt-1 text-xs text-[#8b93b8]">
                  Auth hesabı, öğretmen rolü ve müşteri kaydı otomatik oluşturulur.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#8b93b8] transition-colors hover:bg-[#f0f2fb] hover:text-[#161a3a]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6" autoComplete="off">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                Kurum / Kişi Adı *
              </label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, company_name: e.target.value }))
                }
                required
                autoComplete="organization"
                className="sa-input"
                placeholder="Okul veya kurum adı"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                İletişim Kişisi *
              </label>
              <input
                name="contact_name"
                value={form.contact_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contact_name: e.target.value }))
                }
                required
                autoComplete="name"
                className="sa-input"
                placeholder="Ad Soyad"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                E-posta {isEditing ? "" : "*"}
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required={!isEditing}
                autoComplete="off"
                className="sa-input"
                placeholder="ornek@okul.edu.tr"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                Telefon Numarası
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                autoComplete="tel"
                className="sa-input"
                placeholder="05XX XXX XX XX"
              />
            </div>

            {!isEditing ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                  Geçici Şifre *
                </label>
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  autoComplete="new-password"
                  className="sa-input"
                  placeholder="En az 6 karakter"
                />
                <p className="mt-1.5 text-xs text-[#8b93b8]">
                  Öğretmen ilk girişinde bu şifreyi kullanacaktır.
                </p>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
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
                className="sa-input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
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
                className="sa-input"
              >
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SUBSCRIPTION_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#161a3a]">
                Bitiş Tarihi
              </label>
              <input
                name="expires_at"
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                }
                className="sa-input"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-[#d9def0] bg-white px-4 py-2 text-sm font-medium text-[#5a628c] transition-colors hover:bg-[#f0f2fb] disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-gradient-to-r from-[#6b4dff] to-[#4f7cff] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#6b4dff]/20 transition-all hover:shadow-[#6b4dff]/30 disabled:opacity-50"
              >
                {isPending
                  ? isEditing
                    ? "Güncelleniyor..."
                    : "Onboarding yapılıyor..."
                  : isEditing
                    ? "Güncelle"
                    : "Müşteri Oluştur"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-4 right-4 z-[60] rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${
            toast.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
