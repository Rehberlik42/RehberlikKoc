import { Palette } from "lucide-react";
import ThemePicker from "./_components/ThemePicker";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-[var(--text-primary)] text-xl font-bold">Ayarlar</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Hesap ve görünüm tercihlerinizi yönetin.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Palette className="w-4.5 h-4.5 text-[var(--primary)]" />
          <h3 className="text-[var(--text-primary)] font-semibold">Görünüm</h3>
        </div>
        <p className="text-[var(--text-muted)] text-xs mb-5">
          Dashboard temanızı seçin. Görsel dönüşüm kademeli olarak uygulanacaktır.
        </p>
        <ThemePicker initialTheme={profile?.theme ?? null} />
      </section>
    </div>
  );
}
