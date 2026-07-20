import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import DashboardShell, { type UserProfile } from "./_components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getUser(): Supabase Auth sunucusuna dogrular — SSR'de guvenci
  const { user, error: userError, supabase } = await getCurrentUser();

  if (userError || !user) {
    redirect("/");
  }

  // Kullanicinin profilini cek (RLS: profiles_select_own politikasi gerekli)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, theme")
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
