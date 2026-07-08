"use client";

import { useState, useTransition } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import type { SaasClient } from "@/lib/superadmin/types";
import {
  SUBSCRIPTION_LABELS,
  type SubscriptionStatus,
} from "@/lib/superadmin/constants";
import StatsCards from "./StatsCards";
import ClientModal from "./ClientModal";
import DeleteClientModal from "./DeleteClientModal";

const statusStyles: Record<
  SubscriptionStatus,
  { bg: string; text: string; border: string }
> = {
  trial: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  expired: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ClientsPanel({ clients }: { clients: SaasClient[] }) {
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SaasClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaasClient | null>(null);

  const trialCount = clients.filter((c) => c.subscription_status === "trial").length;
  const activeCount = clients.filter((c) => c.subscription_status === "active").length;

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    startTransition(() => {
      // Server action revalidatePath sonrasi sayfa yenilenir
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#161a3a]">
            SaaS Müşteri Yönetimi
          </h1>
          <p className="mt-1 text-sm text-[#5a628c]">
            Okul ve öğretmen aboneliklerini yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6b4dff] to-[#4f7cff] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#6b4dff]/25 transition-all hover:shadow-[#6b4dff]/35"
        >
          <Plus className="h-4 w-4" />
          Yeni Müşteri Ekle
        </button>
      </div>

      <StatsCards
        total={clients.length}
        trialCount={trialCount}
        activeCount={activeCount}
      />

      <div className="overflow-hidden rounded-2xl border border-[#d9def0] bg-white shadow-sm shadow-[#161a3a]/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d9def0] bg-[#f8f9fd]">
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Kurum / Kişi Adı
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  İletişim
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Abonelik Durumu
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Öğrenci Kotası
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Bitiş Tarihi
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Aksiyonlar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f8]">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#8b93b8]">
                    Henüz müşteri eklenmemiş. İlk müşteriyi eklemek için yukarıdaki
                    butonu kullanın.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const style = statusStyles[client.subscription_status];
                  return (
                    <tr
                      key={client.id}
                      className="transition-colors hover:bg-[#f8f9fd]"
                    >
                      <td className="px-6 py-4 align-middle">
                        <p className="font-semibold text-[#161a3a]">
                          {client.company_name}
                        </p>
                      </td>
                      <td className="px-6 py-4 align-middle text-[#5a628c]">
                        {client.contact_name}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
                        >
                          {SUBSCRIPTION_LABELS[client.subscription_status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle tabular-nums text-[#5a628c]">
                        {client.max_students}
                      </td>
                      <td className="px-6 py-4 align-middle tabular-nums text-[#8b93b8]">
                        {formatDate(client.expires_at)}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="Düzenle"
                            onClick={() => {
                              setEditingClient(client);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-[#4f7cff] transition-colors hover:bg-[#4f7cff]/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => setDeleteTarget(client)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        editingClient={editingClient}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {deleteTarget ? (
        <DeleteClientModal
          client={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            startTransition(() => {});
          }}
        />
      ) : null}
    </div>
  );
}
