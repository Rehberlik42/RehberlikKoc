import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import type {
  AppointmentStatus,
  MeetingType,
  MeetingFormat,
} from "@/lib/appointments";
import TeacherAppointmentsClient from "./_components/TeacherAppointmentsClient";

export const dynamic = "force-dynamic";

// ─── Server-side types ────────────────────────────────────────────────────────
export interface StudentOption {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  grade: string | null;
}

export interface AppointmentRow {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  proposed_date: string | null;
  rejection_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  student: StudentOption | null;
}

export default async function TeacherAppointmentsPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role === "student") redirect("/dashboard/student");

  const [appointmentsRes, studentsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, appointment_date, duration_minutes, status, notes, meeting_type,
         meeting_format, proposed_date, rejection_reason, started_at, completed_at, created_at,
         student:profiles!appointments_student_id_fkey(id, full_name, avatar_url, grade)`
      )
      .eq("teacher_id", user.id)
      .order("appointment_date", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, grade")
      .eq("teacher_id", user.id)
      .eq("role", "student")
      .order("full_name", { ascending: true }),
  ]);

  const appointments = (appointmentsRes.data ?? []) as unknown as AppointmentRow[];
  const students = (studentsRes.data ?? []) as StudentOption[];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-[var(--accent)]" />
            Randevular
          </h2>
          <p className="text-[var(--text-muted)] text-sm">
            Gelen talepleri onayla, yeni saat öner ya da reddet. Tamamlanan
            görüşmelere not ekle.
          </p>
        </div>
        <Link
          href="/dashboard/teacher/appointments/availability"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/40 transition-all"
        >
          <Settings2 className="h-4 w-4" />
          Müsaitlik Ayarları
        </Link>
      </div>

      <TeacherAppointmentsClient
        initialAppointments={appointments}
        students={students}
        teacherId={user.id}
      />
    </div>
  );
}
