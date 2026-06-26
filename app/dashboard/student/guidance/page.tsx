import { redirect } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { GuidanceContent } from "@/lib/guidance";
import GuidanceHub from "./_components/GuidanceHub";

export const dynamic = "force-dynamic";

export default async function StudentGuidancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: raw } = await supabase
    .from("guidance_contents")
    .select(
      "id, title, description, content_type, url, body, target_exam, cover_image_url, is_active, created_at"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const contents = (raw ?? []) as GuidanceContent[];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/25 text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          Content Hub
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <Compass className="w-7 h-7 text-[var(--accent)]" />
          Rehberlik ve Motivasyon Merkezi
        </h2>
        <p className="text-[var(--text-muted)] text-sm max-w-2xl">
          Rehberlik yazıları, motivasyon videoları ve üniversite kılavuzları —
          hepsi tek yerde, MINDORA dark-neon deneyimiyle.
        </p>
      </div>

      <GuidanceHub initialContents={contents} />
    </div>
  );
}
