import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Bot,
  CheckCircle2,
  BookOpenCheck,
  TrendingUp,
  Sparkles,
  Clock,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting(name: string | null) {
  const hour = new Date().getHours();
  const salut =
    hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  return `${salut}, ${name ?? "Öğrenci"} 👋`;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white/5 bg-[#0d0d2b]/60 p-5 overflow-hidden group hover:border-white/10 transition-all duration-300">
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl bg-gradient-to-br ${accent} to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">
            {label}
          </p>
          <p className="text-white text-3xl font-black">{value}</p>
          <p className="text-white/30 text-xs mt-1">{sub}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} from-opacity-30 flex items-center justify-center shrink-0 text-white/70`}
          style={{ background: "rgba(123,47,255,0.15)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  // Bugune ait calisma ozetini cek
  const today = new Date().toISOString().split("T")[0];

  const { data: todaySessions } = await supabase
    .from("study_sessions")
    .select("questions_solved, duration_minutes")
    .eq("student_id", user.id)
    .eq("study_date", today);

  // Bu haftanin başlangici (Pazartesi)
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: weekSessions } = await supabase
    .from("study_sessions")
    .select("duration_minutes, questions_solved")
    .eq("student_id", user.id)
    .gte("study_date", weekStartStr);

  const totalQuestionsToday =
    todaySessions?.reduce((s, r) => s + (r.questions_solved ?? 0), 0) ?? 0;

  const weekMinutes =
    weekSessions?.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) ?? 0;
  const weekHours = Math.floor(weekMinutes / 60);
  const weekMins = weekMinutes % 60;
  const weekTimeStr =
    weekMinutes === 0
      ? "—"
      : weekHours > 0
      ? `${weekHours}s ${weekMins}dk`
      : `${weekMins}dk`;

  // Tamamlanmamis gorev sayisi (bugunun programi - ornek)
  const { count: taskCount } = await supabase
    .from("topic_progress")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("status", "in_progress");

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── Selamlama ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          {greeting(profile?.full_name ?? null)}
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Bugün harika bir gün olacak. DORA senin için burada.
        </p>
      </div>

      {/* ── DORA Motivasyon Kartı ─────────────────────────────────────────── */}
      <div className="relative rounded-3xl border border-[#7B2FFF]/30 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] p-6 md:p-8 overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#7B2FFF]/15 blur-[60px] pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-[#4F7CFF]/10 blur-[50px] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* DORA İkon */}
          <div className="shrink-0 relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B2FFF]/40 to-[#4F7CFF]/20 border border-[#7B2FFF]/30 flex items-center justify-center shadow-xl shadow-[#7B2FFF]/20">
              <Bot className="w-8 h-8 text-[#A78BFF]" />
            </div>
            {/* Pulse */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2FFF] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#7B2FFF]" />
            </span>
          </div>

          {/* İçerik */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7B2FFF]/15 border border-[#7B2FFF]/25 text-[#A78BFF] text-[10px] font-bold uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" />
              DORA · Günün Motivasyonu
            </div>
            <blockquote className="text-white text-base sm:text-lg font-semibold leading-relaxed">
              &ldquo;Başarıya giden yol, bugün attığın adımlarda gizlidir.
              Her çözdüğün soru, hedefine bir adım daha yaklaşmanı sağlar.&rdquo;
            </blockquote>
            <p className="text-white/30 text-xs mt-3 flex items-center gap-1.5 justify-center sm:justify-start">
              <Clock className="w-3 h-3" />
              Bugün · {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Özet Kartları ────────────────────────────────────────────────── */}
      <div>
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
          Günlük Özet
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Bugünkü Görevler"
            value={taskCount !== null ? String(taskCount) : "—"}
            sub="Devam eden konu"
            accent="from-[#7B2FFF]/10"
          />
          <StatCard
            icon={<BookOpenCheck className="w-5 h-5" />}
            label="Çözülen Soru"
            value={totalQuestionsToday > 0 ? String(totalQuestionsToday) : "—"}
            sub="Bugün toplam"
            accent="from-[#4F7CFF]/10"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Haftalık İlerleme"
            value={weekTimeStr}
            sub="Bu hafta çalışma süresi"
            accent="from-[#00D4FF]/10"
          />
        </div>
      </div>

      {/* ── Hızlı Eylemler ────────────────────────────────────────────────── */}
      <div>
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
          Hızlı Erişim
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Program Ekle",    href: "/dashboard/student/program",   color: "from-[#7B2FFF]/20 to-[#7B2FFF]/5",  border: "border-[#7B2FFF]/20" },
            { label: "Deneme Gir",      href: "/dashboard/student/denemeler", color: "from-[#4F7CFF]/20 to-[#4F7CFF]/5",  border: "border-[#4F7CFF]/20" },
            { label: "DORA ile Konuş",  href: "/dashboard/student/dora",      color: "from-[#7B2FFF]/20 to-[#4F7CFF]/10", border: "border-[#7B2FFF]/25" },
            { label: "Kaynak Bul",      href: "/dashboard/student/kaynaklar", color: "from-[#00D4FF]/15 to-[#00D4FF]/5",  border: "border-[#00D4FF]/20" },
          ].map((q) => (
            <a
              key={q.label}
              href={q.href}
              className={`rounded-xl bg-gradient-to-br ${q.color} border ${q.border} p-4 text-white/70 text-sm font-semibold text-center hover:text-white hover:scale-[1.02] transition-all duration-200`}
            >
              {q.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
