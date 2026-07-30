"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { SaasClient } from "@/lib/superadmin/types";
import {
  SUBSCRIPTION_LABELS,
  type SubscriptionStatus,
} from "@/lib/superadmin/constants";
import StatsCards from "./StatsCards";
import ClientModal from "./ClientModal";
import DeleteClientModal from "./DeleteClientModal";
import { updateTeacherSensitiveDataAccess } from "../actions";

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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SaasClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SaasClient | null>(null);
  const [pendingTeacherId, setPendingTeacherId] = useState<string | null>(null);
  const [sensitiveAccess, setSensitiveAccess] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      clients
        .filter((client) => client.auth_user_id)
        .map((client) => [
          client.auth_user_id as string,
          client.sensitive_data_access,
        ])
    )
  );
  const [accessToast, setAccessToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const handleSensitiveAccessToggle = (client: SaasClient) => {
    const teacherId = client.auth_user_id;
    if (!teacherId || pendingTeacherId) return;

    const current =
      sensitiveAccess[teacherId] ?? client.sensitive_data_access;
    const next = !current;
    setPendingTeacherId(teacherId);
    setAccessToast(null);

    startTransition(async () => {
      try {
        const result = await updateTeacherSensitiveDataAccess(teacherId, next);
        if ("error" in result) {
          setAccessToast({ type: "error", message: result.error });
          return;
        }

        setSensitiveAccess((values) => ({
          ...values,
          [teacherId]: next,
        }));
        setAccessToast({
          type: "success",
          message:
            result.message ??
            `${client.contact_name} için erişim güncellendi.`,
        });
        router.refresh();
      } catch {
        setAccessToast({
          type: "error",
          message: "Hassas veri erişimi güncellenemedi.",
        });
      } finally {
        setPendingTeacherId(null);
        setTimeout(() => setAccessToast(null), 3500);
      }
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
                <th className="min-w-[18rem] px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Hassas Veri Erişimi
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-[#8b93b8]">
                  Aksiyonlar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f8]">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#8b93b8]">
                    Henüz müşteri eklenmemiş. İlk müşteriyi eklemek için yukarıdaki
                    butonu kullanın.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const style = statusStyles[client.subscription_status];
                  const isSensitiveAccessEnabled = client.auth_user_id
                    ? (sensitiveAccess[client.auth_user_id] ??
                      client.sensitive_data_access)
                    : false;
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
                        {client.auth_user_id ? (
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isSensitiveAccessEnabled}
                              aria-label={`${client.contact_name} hassas veri erişimi`}
                              disabled={pendingTeacherId !== null}
                              onClick={() =>
                                handleSensitiveAccessToggle(client)
                              }
                              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-wait disabled:opacity-60 ${
                                isSensitiveAccessEnabled
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-[#c9cee3] bg-[#e4e7f2]"
                              }`}
                            >
                              <span
                                className={`mt-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                                  isSensitiveAccessEnabled
                                    ? "translate-x-5"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                            <div>
                              <p
                                className={`text-xs font-semibold ${
                                  isSensitiveAccessEnabled
                                    ? "text-emerald-700"
                                    : "text-[#8b93b8]"
                                }`}
                              >
                                {pendingTeacherId === client.auth_user_id
                                  ? "Güncelleniyor…"
                                  : isSensitiveAccessEnabled
                                    ? "Açık"
                                    : "Kapalı"}
                              </p>
                              <p className="mt-0.5 max-w-[15rem] text-[10px] leading-relaxed text-[#8b93b8]">
                                Açıkken psikolojik geçmiş, tanı ve ilaç
                                kullanımı bilgilerini görebilir.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#8b93b8]">
                            Koç hesabı bağlı değil
                          </p>
                        )}
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

      {accessToast ? (
        <div
          className={`fixed bottom-6 right-6 z-[70] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${
            accessToast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {accessToast.message}
        </div>
      ) : null}
    </div>
  );
}
