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
import type { ClientFormData } from "@/lib/superadmin/types";

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

function parseClientForm(formData: FormData): ClientFormData | { error: string } {
  const company_name = String(formData.get("company_name") ?? "").trim();
  const contact_name = String(formData.get("contact_name") ?? "").trim();
  const max_studentsRaw = String(formData.get("max_students") ?? "").trim();
  const subscription_status = String(
    formData.get("subscription_status") ?? ""
  ) as SubscriptionStatus;
  const expires_atRaw = String(formData.get("expires_at") ?? "").trim();

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
  };
}

export async function createClientRecord(formData: FormData) {
  await requireSuperadminSession();

  const parsed = parseClientForm(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").insert(parsed);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

export async function updateClientRecord(formData: FormData) {
  await requireSuperadminSession();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { error: "Müşteri kimliği bulunamadı." };
  }

  const parsed = parseClientForm(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").update(parsed).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/superadmin");
  return { success: true };
}

export async function deleteClientRecord(id: string) {
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
