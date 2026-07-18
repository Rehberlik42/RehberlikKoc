import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  type AppointmentSettings,
  type AvailabilityRule,
  type AvailabilityException,
} from "@/lib/appointments";
import StudentAppointmentsClient, {
  type StudentAppointment,
  type TeacherInfo,
  type VisibleNote,
  type StudentDecision,
} from "./_components/StudentAppointmentsClient";

export const dynamic = "force-dynamic";

export default async function StudentAppointmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") redirect("/dashboard");

  const teacherId = profile.teacher_id as string | null;

  let teacher: TeacherInfo | null = null;
  let settings: AppointmentSettings = DEFAULT_SETTINGS;
  let rules: AvailabilityRule[] = [];
  let exceptions: AvailabilityException[] = [];
  let appointments: StudentAppointment[] = [];
  let notes: VisibleNote[] = [];
  let decisions: StudentDecision[] = [];

  if (teacherId) {
    const [teacherRes, settingsRes, rulesRes, exceptionsRes, apptRes, notesRes, decisionsRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", teacherId)
          .maybeSingle(),
        supabase
          .from("teacher_appointment_settings")
          .select("slot_minutes, buffer_minutes, max_daily")
          .eq("teacher_id", teacherId)
          .maybeSingle(),
        supabase
          .from("teacher_availability_rules")
          .select("id, day_of_week, start_time, end_time")
          .eq("teacher_id", teacherId),
        supabase
          .from("teacher_availability_exceptions")
          .select("id, date, start_time, end_time, reason")
          .eq("teacher_id", teacherId)
          .gte("date", new Date().toISOString().slice(0, 10)),
        supabase
          .from("appointments")
          .select(
            "id, appointment_date, duration_minutes, status, notes, meeting_type, meeting_format, proposed_date, rejection_reason, created_at"
          )
          .eq("student_id", user.id)
          .order("appointment_date", { ascending: false }),
        supabase
          .from("meeting_notes")
          .select(
            "appointment_id, subject_topic, student_opinion, parent_opinion, visibility, follow_up_topics, next_meeting_date"
          )
          .eq("student_id", user.id),
        supabase
          .from("meeting_decisions")
          .select("id, appointment_id, kind, text_content, is_completed")
          .eq("student_id", user.id),
      ]);

    teacher = (teacherRes.data as TeacherInfo | null) ?? null;
    settings = settingsRes.data ?? DEFAULT_SETTINGS;
    rules = (rulesRes.data ?? []) as AvailabilityRule[];
    exceptions = (exceptionsRes.data ?? []) as AvailabilityException[];
    appointments = (apptRes.data ?? []) as StudentAppointment[];
    notes = (notesRes.data ?? []) as VisibleNote[];
    decisions = (decisionsRes.data ?? []) as StudentDecision[];
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <CalendarCheck className="w-7 h-7 text-[var(--accent)]" />
          Randevularım
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          Öğretmeninle görüşme talebi oluştur, randevularını ve görüşme
          geçmişini takip et.
        </p>
      </div>

      {!teacherId || !teacher ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Henüz sana atanmış bir öğretmen yok. Randevu alabilmek için önce
            bir öğretmene bağlanman gerekiyor.
          </p>
        </div>
      ) : (
        <StudentAppointmentsClient
          studentId={user.id}
          teacher={teacher}
          settings={settings}
          rules={rules}
          exceptions={exceptions}
          initialAppointments={appointments}
          notes={notes}
          decisions={decisions}
        />
      )}
    </div>
  );
}
