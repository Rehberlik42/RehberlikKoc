import { redirect } from "next/navigation";
import { Sparkles, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AppointmentsBoard from "./_components/AppointmentsBoard";

export const dynamic = "force-dynamic";

// ─── Server-side types (board'a aktarılır) ────────────────────────────────────
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
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  session_notes: string | null;
  created_at: string;
  student: StudentOption | null;
}

export default async function TeacherAppointmentsPage() {
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

  // ─── İlk veri yüklemesi (paralel) ──────────────────────────────────────────
  const [appointmentsRes, studentsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, appointment_date, duration_minutes, status, notes, session_notes, created_at,
         student:profiles!appointments_student_id_fkey(id, full_name, avatar_url, grade)`
      )
      .eq("teacher_id", user.id)
      .order("appointment_date", { ascending: true }),
    supabase
      .from("teacher_students")
      .select(
        `student_id,
         student:profiles!teacher_students_student_id_fkey(id, full_name, avatar_url, grade)`
      )
      .eq("teacher_id", user.id)
      .eq("is_active", true),
  ]);

  const appointments = (appointmentsRes.data ?? []) as unknown as AppointmentRow[];
  const students = (studentsRes.data ?? [])
    .map(
      (r) =>
        (r as unknown as { student: StudentOption | null }).student ?? null
    )
    .filter((s): s is StudentOption => s !== null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4F7CFF]/15 border border-[#4F7CFF]/25 text-[#7AB3FF] text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" />
            Trello tarzı koçluk takvimi
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-[#A78BFF]" />
            Randevu Takvimim
          </h2>
          <p className="text-white/40 text-sm">
            Kartları sürükleyip bırakarak randevuların durumunu güncelleyebilirsin.
            Değişiklikler anında kaydedilir.
          </p>
        </div>
      </div>

      <AppointmentsBoard
        initialAppointments={appointments}
        students={students}
        teacherId={user.id}
      />
    </div>
  );
}
