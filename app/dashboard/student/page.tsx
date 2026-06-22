import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TodayTasks from "./_components/TodayTasks";
import {
  getDayLabelFull,
  mapStudyPlanTaskRow,
  STUDY_PLAN_TASK_SELECT,
  toISODate,
} from "./program/_components/plan-shared";

export default async function StudentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  const today = new Date();
  const todayStr = toISODate(today);
  const todayDayName = getDayLabelFull(today);
  const todayDateLong = today.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { data: todayTasksRaw } = await supabase
    .from("study_plan_tasks")
    .select(STUDY_PLAN_TASK_SELECT)
    .eq("student_id", user.id)
    .eq("plan_date", todayStr)
    .order("order_index", { ascending: true })
    .order("start_time", { ascending: true });

  const initialTasks = (todayTasksRaw ?? []).map(mapStudyPlanTaskRow);
  const firstName = profile?.full_name?.split(" ")[0] ?? "Öğrenci";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white sm:text-3xl">
          Merhaba, {firstName}! 👋
        </h2>
        <p className="mt-1 text-sm text-white/40">
          Bugün planına sadık kal — her görev seni hedefine bir adım daha yaklaştırır.
        </p>
      </div>

      <TodayTasks
        initialTasks={initialTasks}
        todayDayName={todayDayName}
        todayDateLong={todayDateLong}
      />

      <div className="rounded-2xl border border-white/5 bg-[#0d0d2b]/40 px-4 py-3 text-center text-xs text-white/35">
        Unutma: Küçük adımlar büyük sonuçlar doğurur. Bugünkü görevlerini tamamlamak için
        kendine güven!
      </div>
    </div>
  );
}
