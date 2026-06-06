"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SUPERADMIN_PASSWORD,
  SUPERADMIN_SESSION_COOKIE,
  SUPERADMIN_SESSION_VALUE,
  SUPERADMIN_USERNAME,
  type SubscriptionStatus,
} from "@/lib/superadmin/constants";
import { requireSuperadminSession } from "@/lib/superadmin/session";
import type {
  ActionResult,
  ClientFormData,
  OnboardingFormData,
} from "@/lib/superadmin/types";

export async function loginSuperadmin(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username !== SUPERADMIN_USERNAME || password !== SUPERADMIN_PASSWORD) {
    return { error: "Geçersiz kullanıcı adı veya şifre." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SUPERADMIN_SESSION_COOKIE, SUPERADMIN_SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/superadmin");
}

export async function logoutSuperadmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SUPERADMIN_SESSION_COOKIE);
  redirect("/superadmin/login");
}

function parseClientBase(formData: FormData): ClientFormData | { error: string } {
  const company_name = String(formData.get("company_name") ?? "").trim();
  const contact_name = String(formData.get("contact_name") ?? "").trim();
  const max_studentsRaw = String(formData.get("max_students") ?? "").trim();
  const subscription_status = String(
    formData.get("subscription_status") ?? ""
  ) as SubscriptionStatus;
  const expires_atRaw = String(formData.get("expires_at") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();

  if (!company_name) {
    return { error: "Kurum/kişi adı zorunludur." };
  }

  if (!contact_name) {
    return { error: "İletişim kişisi zorunludur." };
  }

  const max_students = Number(max_studentsRaw);
  if (!Number.isFinite(max_students) || max_students < 0) {
    return { error: "Geçerli bir öğrenci kotası girin." };
  }

  if (!["trial", "active", "expired"].includes(subscription_status)) {
    return { error: "Geçersiz abonelik tipi." };
  }

  return {
    company_name,
    contact_name,
    max_students,
    subscription_status,
    expires_at: expires_atRaw ? expires_atRaw : null,
    email: email || undefined,
    phone: phoneRaw || null,
  };
}

function parseOnboardingForm(formData: FormData): OnboardingFormData | { error: string } {
  const base = parseClientBase(formData);
  if ("error" in base) {
    return base;
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "E-posta zorunludur." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }

  if (password.length < 6) {
    return { error: "Geçici şifre en az 6 karakter olmalıdır." };
  }

  return {
    ...base,
    email,
    password,
  };
}

function isDuplicateEmailError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("duplicate") ||
    normalized.includes("exists")
  );
}

async function ensureTeacherProfile(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  contactName: string
) {
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await admin
      .from("profiles")
      .update({ full_name: contactName, role: "teacher" })
      .eq("id", userId);

    if (error) {
      return { error: error.message };
    }
    return { success: true as const };
  }

  const { error } = await admin.from("profiles").insert({
    id: userId,
    full_name: contactName,
    role: "teacher",
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true as const };
}

export async function createClientRecord(formData: FormData): Promise<ActionResult> {
  await requireSuperadminSession();

  const parsed = parseOnboardingForm(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const admin = createAdminClient();
  let createdUserId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: parsed.email,
        password: parsed.password,
        email_confirm: true,
        user_metadata: {
          full_name: parsed.contact_name,
        },
      });

    if (authError) {
      if (isDuplicateEmailError(authError.message)) {
        return { error: "Bu e-posta adresi zaten kayıtlı." };
      }
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "Kullanıcı oluşturulamadı." };
    }

    createdUserId = authData.user.id;

    const { error: roleError } = await admin.auth.admin.updateUserById(
      createdUserId,
      {
        app_metadata: { role: "teacher" },
      }
    );

    if (roleError) {
      throw new Error(roleError.message);
    }

    const profileResult = await ensureTeacherProfile(
      admin,
      createdUserId,
      parsed.contact_name
    );

    if ("error" in profileResult) {
      throw new Error(profileResult.error);
    }

    const { error: clientError } = await admin.from("clients").insert({
      company_name: parsed.company_name,
      contact_name: parsed.contact_name,
      max_students: parsed.max_students,
      subscription_status: parsed.subscription_status,
      expires_at: parsed.expires_at,
      email: parsed.email,
      phone: parsed.phone,
      auth_user_id: createdUserId,
    });

    if (clientError) {
      throw new Error(clientError.message);
    }

    revalidatePath("/superadmin");
    return {
      success: true,
      message:
        "Müşteri kaydedildi, öğretmen hesabı oluşturuldu ve onboarding tamamlandı.",
    };
  } catch (err) {
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }

    const message =
      err instanceof Error ? err.message : "Onboarding sırasında bir hata oluştu.";
    return { error: message };
  }
}

export async function updateClientRecord(formData: FormData): Promise<ActionResult> {
  await requireSuperadminSession();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { error: "Müşteri kimliği bulunamadı." };
  }

  const parsed = parseClientBase(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({
      company_name: parsed.company_name,
      contact_name: parsed.contact_name,
      max_students: parsed.max_students,
      subscription_status: parsed.subscription_status,
      expires_at: parsed.expires_at,
      email: parsed.email ?? null,
      phone: parsed.phone,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  return { success: true, message: "Müşteri bilgileri güncellendi." };
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  await requireSuperadminSession();

  if (!id) {
    return { error: "Müşteri kimliği bulunamadı." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  return { success: true };
}
