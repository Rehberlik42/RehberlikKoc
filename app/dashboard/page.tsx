import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// /dashboard → role'e gore ogrenci veya ogretmen dashboardina yonlendir
export default async function DashboardIndexPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "teacher" || profile?.role === "admin") {
    redirect("/dashboard/teacher");
  }

  redirect("/dashboard/student");
}
