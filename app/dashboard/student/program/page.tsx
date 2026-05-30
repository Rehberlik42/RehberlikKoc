import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, Sparkles } from "lucide-react";
import ProgramContent from "./_components/ProgramContent";
import ProgramExportBar from "./_components/ProgramExportBar";
import type { Subject } from "./_components/SessionEntryForm";

export default async function ProgramPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Tum dersleri ve konularini cek (RLS: authenticated herkes okuyabilir)
  const { data: rawSubjects } = await supabase
    .from("subjects")
    .select(
      `id, name, order_index,
       exam:exams(name),
       topics(id, name, order_index)`
    )
    .order("order_index");

  // Supabase join sonucu dizi olarak gelebilir, normalize et
  const subjects: Subject[] = (rawSubjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    order_index: s.order_index,
    exam: Array.isArray(s.exam) ? s.exam[0] ?? null : (s.exam as { name: string } | null),
    topics: Array.isArray(s.topics)
      ? s.topics.sort((a, b) => a.order_index - b.order_index)
      : [],
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2FFF]/15 border border-[#7B2FFF]/25 text-[#A78BFF] text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" />
            Faz 2 · Aktif Modül
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <CalendarDays className="w-7 h-7 text-[#7B2FFF]" />
            Çalışma Programım ve Veri Girişi
          </h2>
          <p className="text-white/40 text-sm mt-1.5">
            Her çalıştığında veri gir — DORA performansını analiz eder, zayıf
            konularına kaynak önerir.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 text-center">
            <p className="text-white font-black text-xl">{subjects.length}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Ders</p>
          </div>
          <ProgramExportBar />
        </div>
      </div>

      {/* İpucu banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-[#4F7CFF]/8 border border-[#4F7CFF]/20 text-white/50 text-xs leading-relaxed">
        <Sparkles className="w-3.5 h-3.5 text-[#7AB3FF] shrink-0 mt-0.5" />
        <span>
          <strong className="text-white/70">İpucu:</strong> Dersi seçtikten
          sonra konu listesi otomatik güncellenir. Neti sistem hesaplar.
          Kaydet butonuna bastığında liste anında yenilenir.
        </span>
      </div>

      {/* Ana içerik: Form (sol) + Liste (sağ) */}
      <ProgramContent subjects={subjects} />
    </div>
  );
}
