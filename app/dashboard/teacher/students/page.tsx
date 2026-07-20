import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import StudentsPanel from "./_components/StudentsPanel";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const { user, supabase } = await getCurrentUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("teacher_id", user.id)
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (studentsError) {
    console.error("Teacher students fetch error:", studentsError);
  }

  const admin = createAdminClient();

  const { data: clientRow } = await admin
    .from("clients")
    .select("max_students")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const maxStudents = clientRow?.max_students ?? 0;
  const currentCount = students?.length ?? 0;

  return (
    <StudentsPanel
      students={students ?? []}
      currentCount={currentCount}
      maxStudents={maxStudents}
    />
  );
}
