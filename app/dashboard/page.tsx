import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

// /dashboard → role'e gore ogrenci veya ogretmen dashboardina yonlendir
export default async function DashboardIndexPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const appRole = user.app_metadata?.role as string | undefined;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profileRole = profile?.role;

  if (
    appRole === "teacher" ||
    appRole === "admin" ||
    profileRole === "teacher" ||
    profileRole === "admin"
  ) {
    redirect("/dashboard/teacher");
  }

  redirect("/dashboard/student");
}
