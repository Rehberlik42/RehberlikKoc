import { redirect } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  AppointmentStatus,
  MeetingType,
  MeetingFormat,
} from "@/lib/appointments";
import ReportsClient, {
  type ReportAppointment,
  type ReportDecision,
  type ReportStudent,
} from "./_components/ReportsClient";

export const dynamic = "force-dynamic";

export default async function TeacherReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role === "student") redirect("/dashboard/student");

  // Son 12 ay yeterli — rapor dönem filtreleri bu aralıkta çalışır
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const [apptRes, decRes, studentsRes, tasksRes, examsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, appointment_date, duration_minutes, status, meeting_type, meeting_format,
         student:profiles!appointments_student_id_fkey(id, full_name)`
      )
      .eq("teacher_id", user.id)
      .gte("appointment_date", sinceIso)
      .order("appointment_date", { ascending: false }),
    supabase
      .from("meeting_decisions")
      .select("id, appointment_id, student_id, kind, text_content, is_completed, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, grade")
      .eq("teacher_id", user.id)
      .eq("role", "student")
      .order("full_name"),
    supabase
      .from("study_plan_tasks")
      .select("student_id, is_completed, plan_date")
      .eq("teacher_id", user.id)
      .gte("plan_date", sinceDate),
    supabase
      .from("mock_exams")
      .select("id, student_id, exam_date")
      .gte("exam_date", sinceDate),
  ]);

  type ApptRaw = {
    id: number;
    appointment_date: string;
    duration_minutes: number;
    status: AppointmentStatus;
    meeting_type: MeetingType;
    meeting_format: MeetingFormat;
    student: { id: string; full_name: string | null } | null;
  };

  const appointments: ReportAppointment[] = (
    (apptRes.data ?? []) as unknown as ApptRaw[]
  ).map((a) => ({
    id: a.id,
    appointment_date: a.appointment_date,
    duration_minutes: a.duration_minutes,
    status: a.status,
    meeting_type: a.meeting_type,
    meeting_format: a.meeting_format,
    student_id: a.student?.id ?? null,
    student_name: a.student?.full_name ?? null,
  }));

  const decisions = (decRes.data ?? []) as ReportDecision[];

  // Öğrenci bazında görev/deneme özetleri
  const taskAgg = new Map<string, { total: number; done: number }>();
  for (const t of tasksRes.data ?? []) {
    const agg = taskAgg.get(t.student_id) ?? { total: 0, done: 0 };
    agg.total += 1;
    if (t.is_completed) agg.done += 1;
    taskAgg.set(t.student_id, agg);
  }
  const examAgg = new Map<string, number>();
  for (const e of examsRes.data ?? []) {
    examAgg.set(e.student_id, (examAgg.get(e.student_id) ?? 0) + 1);
  }

  const students: ReportStudent[] = (studentsRes.data ?? []).map((s) => ({
    id: s.id as string,
    full_name: (s.full_name as string | null) ?? "İsimsiz",
    grade: (s.grade as string | null) ?? null,
    taskTotal: taskAgg.get(s.id as string)?.total ?? 0,
    taskDone: taskAgg.get(s.id as string)?.done ?? 0,
    examCount: examAgg.get(s.id as string) ?? 0,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <FileBarChart className="w-7 h-7 text-[var(--accent)]" />
          Raporlar
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          Görüşme istatistikleri, tamamlanmayan kararlar ve öğrenci gelişim
          özeti — tek ekranda, PDF olarak dışa aktarılabilir.
        </p>
      </div>

      <ReportsClient
        appointments={appointments}
        decisions={decisions}
        students={students}
        teacherName={profile?.full_name ?? "Öğretmen"}
      />
    </div>
  );
}
