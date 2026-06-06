import { createClient } from "@/lib/supabase/server";
import { GuidanceContent } from "@/lib/guidance";
import ContentTable from "./_components/ContentTable";

export default async function AdminContentPage() {
  const supabase = await createClient();

  // ─── Fetch all guidance contents (newest first) ────────────────────────────
  const { data: contents, error } = await supabase
    .from("guidance_contents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching guidance contents:", error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            İçerik Yönetim Sistemi (CMS)
          </h1>
          <p className="text-white/40 mt-2">
            Rehberlik içeriklerinizi yönetin, ekleyin ve düzenleyin.
          </p>
        </div>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          İçerikler yüklenirken hata oluştu. Lütfen daha sonra tekrar deneyin.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          İçerik Yönetim Sistemi (CMS)
        </h1>
        <p className="text-white/40 mt-2">
          Rehberlik içeriklerinizi yönetin, ekleyin ve düzenleyin.
        </p>
      </div>

      {/* Content Table */}
      <ContentTable contents={(contents || []) as GuidanceContent[]} />
    </div>
  );
}
