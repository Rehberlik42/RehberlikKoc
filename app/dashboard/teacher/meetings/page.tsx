import { redirect } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { MeetingType, MeetingFormat, AppointmentStatus } from "@/lib/appointments";
import MeetingHistoryClient, {
  type MeetingRecord,
} from "./_components/MeetingHistoryClient";

export const dynamic = "force-dynamic";

export default async function TeacherMeetingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "student") redirect("/dashboard/student");

  const [apptRes, notesRes, privRes, decRes, studentsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, appointment_date, duration_minutes, status, meeting_type, meeting_format,
         student:profiles!appointments_student_id_fkey(id, full_name, avatar_url, grade)`
      )
      .eq("teacher_id", user.id)
      .eq("status", "completed")
      .order("appointment_date", { ascending: false }),
    supabase
      .from("meeting_notes")
      .select(
        "appointment_id, subject_topic, student_opinion, parent_opinion, visibility, next_meeting_date"
      )
      .eq("teacher_id", user.id),
    supabase
      .from("meeting_private_notes")
      .select("appointment_id, evaluation")
      .eq("teacher_id", user.id),
    supabase
      .from("meeting_decisions")
      .select("id, appointment_id, kind, text_content, is_completed, study_plan_task_id")
      .eq("teacher_id", user.id),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("teacher_id", user.id)
      .eq("role", "student")
      .order("full_name"),
  ]);

  type ApptRaw = {
    id: number;
    appointment_date: string;
    duration_minutes: number;
    status: AppointmentStatus;
    meeting_type: MeetingType;
    meeting_format: MeetingFormat;
    student: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      grade: string | null;
    } | null;
  };

  const noteMap = new Map(
    (notesRes.data ?? []).map((n) => [n.appointment_id as number, n])
  );
  const privMap = new Map(
    (privRes.data ?? []).map((n) => [n.appointment_id as number, n])
  );
  const decMap = new Map<number, NonNullable<typeof decRes.data>>();
  for (const d of decRes.data ?? []) {
    const list = decMap.get(d.appointment_id as number) ?? [];
    list.push(d);
    decMap.set(d.appointment_id as number, list);
  }

  const records: MeetingRecord[] = (
    (apptRes.data ?? []) as unknown as ApptRaw[]
  ).map((a) => {
    const note = noteMap.get(a.id);
    const priv = privMap.get(a.id);
    const decisions = (decMap.get(a.id) ?? []).map((d) => ({
      id: d.id as number,
      kind: d.kind as "decision" | "task" | "follow_up",
      text_content: d.text_content as string,
      is_completed: d.is_completed as boolean,
      study_plan_task_id: d.study_plan_task_id as number | null,
    }));
    return {
      id: a.id,
      appointment_date: a.appointment_date,
      duration_minutes: a.duration_minutes,
      meeting_type: a.meeting_type,
      meeting_format: a.meeting_format,
      student: a.student,
      subject_topic: (note?.subject_topic as string | null) ?? null,
      student_opinion: (note?.student_opinion as string | null) ?? null,
      parent_opinion: (note?.parent_opinion as string | null) ?? null,
      visibility: (note?.visibility as string | null) ?? null,
      next_meeting_date: (note?.next_meeting_date as string | null) ?? null,
      evaluation: (priv?.evaluation as string | null) ?? null,
      decisions,
    };
  });

  const students = (studentsRes.data ?? []) as { id: string; full_name: string | null }[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <MessageSquareText className="w-7 h-7 text-[var(--accent)]" />
          Görüşme Geçmişi
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          Tüm görüşme notlarını kronolojik olarak incele, filtrele ve içlerinde
          arama yap.
        </p>
      </div>

      <MeetingHistoryClient
        records={records}
        students={students}
        teacherId={user.id}
      />
    </div>
  );
}
