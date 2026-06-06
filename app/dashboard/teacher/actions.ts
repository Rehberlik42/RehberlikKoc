"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeacherActionResult =
  | { success: true }
  | { error: string };

function isDuplicateEmailError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("duplicate") ||
    normalized.includes("exists")
  );
}

async function requireTeacherId(): Promise<
  { teacherId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum bulunamadı." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "student") {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  return { teacherId: user.id };
}

export async function addStudent(
  formData: FormData
): Promise<TeacherActionResult> {
  const auth = await requireTeacherId();
  if ("error" in auth) {
    return auth;
  }

  const teacherId = auth.teacherId;
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();

  if (!full_name) {
    return { error: "Öğrenci adı zorunludur." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const admin = createAdminClient();

  const { data: clientRow } = await admin
    .from("clients")
    .select("max_students")
    .eq("auth_user_id", teacherId)
    .maybeSingle();

  const maxStudents = clientRow?.max_students ?? 0;

  const { count: currentCount, error: countError } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .eq("role", "student");

  if (countError) {
    return { error: countError.message };
  }

  if ((currentCount ?? 0) >= maxStudents) {
    return {
      error: "Öğrenci kotanız dolmuştur. Lütfen paketinizi yükseltin.",
    };
  }

  let createdUserId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError) {
      if (isDuplicateEmailError(authError.message)) {
        return { error: "Bu e-posta adresi zaten kayıtlı." };
      }
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Öğrenci hesabı oluşturulamadı." };
    }

    createdUserId = authData.user.id;

    const { error: roleError } = await admin.auth.admin.updateUserById(
      createdUserId,
      { app_metadata: { role: "student" } }
    );

    if (roleError) {
      throw new Error(roleError.message);
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", createdUserId)
      .maybeSingle();

    const profilePayload = {
      full_name,
      role: "student" as const,
      teacher_id: teacherId,
      phone: phone || null,
    };

    if (existingProfile) {
      const { error: profileError } = await admin
        .from("profiles")
        .update(profilePayload)
        .eq("id", createdUserId);

      if (profileError) {
        throw new Error(profileError.message);
      }
    } else {
      const { error: profileError } = await admin.from("profiles").insert({
        id: createdUserId,
        ...profilePayload,
      });

      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    revalidatePath("/dashboard/teacher/students");
    return { success: true };
  } catch (err) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }

    const message =
      err instanceof Error
        ? err.message
        : "Öğrenci eklenirken bir hata oluştu.";
    return { error: message };
  }
}
