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
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  active: {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  expired: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
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
          <h1 className="text-3xl font-bold text-white">SaaS Müşteri Yönetimi</h1>
          <p className="mt-1 text-sm text-white/40">
            Okul ve öğretmen aboneliklerini yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7B2FFF]/25 transition-all hover:shadow-[#7B2FFF]/40"
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

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Kurum / Kişi Adı
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                İletişim
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Abonelik Durumu
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Öğrenci Kotası
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Bitiş Tarihi
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                Aksiyonlar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-white/40">
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
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{client.company_name}</p>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {client.contact_name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
                      >
                        {SUBSCRIPTION_LABELS[client.subscription_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {client.max_students}
                    </td>
                    <td className="px-6 py-4 text-white/50">
                      {formatDate(client.expires_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Düzenle"
                          onClick={() => {
                            setEditingClient(client);
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-[#4F7CFF] transition-colors hover:bg-[#4F7CFF]/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Sil"
                          onClick={() => setDeleteTarget(client)}
                          className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
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
