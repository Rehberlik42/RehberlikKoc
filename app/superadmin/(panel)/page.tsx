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

  const rawClients = (clients ?? []) as Omit<
    SaasClient,
    "sensitive_data_access"
  >[];
  const teacherIds = rawClients
    .map((client) => client.auth_user_id)
    .filter((id): id is string => Boolean(id));
  const sensitiveAccessByTeacher = new Map<string, boolean>();

  if (teacherIds.length > 0) {
    const { data: teacherProfiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, sensitive_data_access")
      .in("id", teacherIds)
      .eq("role", "teacher");

    if (profilesError) {
      console.error("Superadmin teacher profiles fetch error:", profilesError);
    } else {
      for (const profile of teacherProfiles ?? []) {
        sensitiveAccessByTeacher.set(
          profile.id,
          profile.sensitive_data_access === true
        );
      }
    }
  }

  const clientsWithAccess: SaasClient[] = rawClients.map((client) => ({
    ...client,
    sensitive_data_access: client.auth_user_id
      ? (sensitiveAccessByTeacher.get(client.auth_user_id) ?? false)
      : false,
  }));

  return <ClientsPanel clients={clientsWithAccess} />;
}
