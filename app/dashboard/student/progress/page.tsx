import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MapPin, Sparkles } from "lucide-react";
import ProgressClient, {
  type SubjectWithTopics,
  type TopicWithProgress,
} from "./_components/ProgressClient";
import type { TopicProgressData, ProgressStatus } from "./_components/TopicRow";

export default async function ProgressPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const userId = user.id;

  // Tum dersleri ve konulari cek
  const { data: rawSubjects } = await supabase
    .from("subjects")
    .select(
      `id, name, icon, color, order_index,
       exam:exams(name),
       topics(id, name, order_index)`
    )
    .order("order_index");

  // Bu ogrencinin konu ilerlemelerini cek
  const { data: progressRecords } = await supabase
    .from("topic_progress")
    .select("topic_id, status, completion_percentage, last_studied_at")
    .eq("student_id", userId);

  // Progress kayitlarini map'e donustur (hizli erisim)
  const progressByTopic = new Map<number, TopicProgressData>();
  (progressRecords ?? []).forEach((p) => {
    progressByTopic.set(p.topic_id, {
      status: p.status as ProgressStatus,
      completion_percentage: p.completion_percentage,
      last_studied_at: p.last_studied_at,
    });
  });

  // Subjects + topics + progress'i birlestir
  const subjects: SubjectWithTopics[] = (rawSubjects ?? []).map((s) => {
    const examVal = Array.isArray(s.exam) ? s.exam[0] ?? null : (s.exam as { name: string } | null);
    const topicsArr = Array.isArray(s.topics) ? s.topics : [];

    const topicsWithProgress: TopicWithProgress[] = topicsArr
      .sort((a, b) => a.order_index - b.order_index)
      .map((t) => ({
        id: t.id,
        name: t.name,
        order_index: t.order_index,
        progress: progressByTopic.get(t.id) ?? null,
      }));

    return {
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      order_index: s.order_index,
      exam: examVal,
      topics: topicsWithProgress,
    };
  });

  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const completedTopics = subjects.reduce(
    (acc, s) =>
      acc + s.topics.filter((t) => t.progress?.status === "completed").length,
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-2)]/15 border border-[var(--primary-2)]/25 text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" />
            Konu Takip Çizelgesi
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <MapPin className="w-7 h-7 text-[var(--primary-2)]" />
            Müfredat ve Konu İlerlemem
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1.5">
            Her konunun durumunu güncelle — DORA durumuna göre kaynak önerir.
          </p>
        </div>

        {/* Hızlı özet pill */}
        <div className="shrink-0 flex gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center">
            <p className="text-[var(--text-primary)] font-black text-xl">{completedTopics}</p>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Bitti</p>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center">
            <p className="text-[var(--text-primary)] font-black text-xl">{totalTopics}</p>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Toplam</p>
          </div>
        </div>
      </div>

      {/* Ana içerik */}
      <ProgressClient subjects={subjects} studentId={userId} />
    </div>
  );
}
