import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, CalendarCheck, FileBarChart, Sparkles } from "lucide-react";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");

  const { count: studentCount } = await supabase
    .from("teacher_students")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .eq("is_active", true);

  const { count: appointmentCount } = await supabase
    .from("appointments")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", user.id)
    .eq("status", "confirmed");

  const hour = new Date().getHours();
  const salut = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Selamlama */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          {salut}, {profile?.full_name ?? "Öğretmen"} 👋
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Öğrenci takip paneline hoş geldiniz.
        </p>
      </div>

      {/* Stat Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, label: "Aktif Öğrenci", value: studentCount ?? 0, sub: "Size atanmış", color: "from-[#7B2FFF]/10" },
          { icon: <CalendarCheck className="w-5 h-5" />, label: "Onaylı Randevu", value: appointmentCount ?? 0, sub: "Yaklaşan seans", color: "from-[#4F7CFF]/10" },
          { icon: <FileBarChart className="w-5 h-5" />, label: "Raporlar", value: "—", sub: "Yakında", color: "from-[#00D4FF]/10" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border border-white/5 bg-gradient-to-br ${s.color} from-opacity-10 bg-[#0d0d2b]/60 p-5`}
          >
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</p>
            <p className="text-white text-3xl font-black">{s.value}</p>
            <p className="text-white/30 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Coming soon banner */}
      <div className="rounded-2xl border border-[#4F7CFF]/20 bg-gradient-to-br from-[#4F7CFF]/10 to-transparent p-6 flex items-center gap-4">
        <Sparkles className="w-6 h-6 text-[#7AB3FF] shrink-0" />
        <div>
          <p className="text-white font-semibold text-sm">Öğretmen paneli geliştiriliyor</p>
          <p className="text-white/40 text-xs mt-0.5">
            Faz 4&apos;te öğrenci takip, randevu yönetimi ve seans notları burada olacak.
          </p>
        </div>
      </div>
    </div>
  );
}
