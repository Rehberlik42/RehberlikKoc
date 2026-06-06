import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell, { UserProfile } from "@/app/dashboard/_components/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // ─── Get current user ──────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // ─── Check role from app_metadata ──────────────────────────────────────────
  const userRole = user.user_metadata?.role || user.app_metadata?.role;

  if (userRole !== "admin") {
    // Yetkisiz erişim - ana sayfaya yönlendir
    return redirect("/dashboard");
  }

  // ─── Get user profile ─────────────────────────────────────────────────────
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return redirect("/auth/login");
  }

  const userProfile: UserProfile = {
    id: profile.id,
    full_name: profile.full_name,
    role: "admin",
    avatar_url: profile.avatar_url,
  };

  return (
    <DashboardShell profile={userProfile}>
      {children}
    </DashboardShell>
  );
}
