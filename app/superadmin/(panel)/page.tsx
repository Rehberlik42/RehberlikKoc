import { createAdminClient } from "@/lib/supabase/admin";
import type { SaasClient } from "@/lib/superadmin/types";
import ClientsPanel from "../_components/ClientsPanel";

export default async function SuperadminPage() {
  const admin = createAdminClient();

  const { data: clients, error } = await admin
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Superadmin clients fetch error:", error);
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-white">SaaS Müşteri Yönetimi</h1>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          Müşteriler yüklenirken hata oluştu: {error.message}
        </div>
      </div>
    );
  }

  return <ClientsPanel clients={(clients ?? []) as SaasClient[]} />;
}
