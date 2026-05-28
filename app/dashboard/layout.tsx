import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell, { type UserProfile } from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser(): Supabase Auth sunucusuna dogrular — SSR'de guvenci
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  // Kullanicinin profilini cek (RLS: profiles_select_own politikasi gerekli)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/");
  }

  return (
    <DashboardShell profile={profile as UserProfile}>
      {children}
    </DashboardShell>
  );
}
