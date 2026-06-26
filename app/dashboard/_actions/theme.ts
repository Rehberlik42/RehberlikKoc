"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTheme, type ThemeId } from "@/lib/themes";

export type SetThemeResult = { success: true } | { error: string };

export async function setTheme(theme: string): Promise<SetThemeResult> {
  if (!isValidTheme(theme)) {
    return { error: "Geçersiz tema." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum bulunamadı." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme: theme as ThemeId })
    .eq("id", user.id);

  if (error) {
    return { error: "Tema kaydedilemedi." };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
