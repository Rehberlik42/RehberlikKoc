"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  CalendarPlus,
  Clock,
  ChevronDown,
  Video,
  Users2,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ListChecks,
  StickyNote,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  STATUS_LABELS,
  formatDateTR,
  formatTimeTR,
  type MeetingType,
  type MeetingFormat,
  type AppointmentStatus,
  type AppointmentSettings,
  type AvailabilityRule,
  type AvailabilityException,
} from "@/lib/appointments";
import AppToaster from "@/app/dashboard/_components/AppToaster";
import RequestWizard from "./RequestWizard";

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface TeacherInfo {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface StudentAppointment {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  proposed_date: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface VisibleNote {
  appointment_id: number;
  subject_topic: string | null;
  student_opinion: string | null;
  parent_opinion: string | null;
  visibility: string;
  follow_up_topics: string[];
  next_meeting_date: string | null;
}

export interface StudentDecision {
  id: number;
  appointment_id: number;
  kind: "decision" | "task" | "follow_up";
  text_content: string;
  is_completed: boolean;
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  proposed: "bg-[var(--primary-2)]/15 border-[var(--primary-2)]/30 text-[var(--accent)]",
  confirmed: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  in_progress: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  completed: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]",
  cancelled: "bg-rose-500/15 border-rose-500/30 text-rose-300",
  rejected: "bg-rose-500/15 border-rose-500/30 text-rose-300",
};

const FORMAT_ICONS: Record<MeetingFormat, React.ReactNode> = {
  online: <Video className="w-3.5 h-3.5" />,
  in_person: <Users2 className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
};

interface Props {
  studentId: string;
  teacher: TeacherInfo;
  settings: AppointmentSettings;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  initialAppointments: StudentAppointment[];
  notes: VisibleNote[];
  decisions: StudentDecision[];
}

export default function StudentAppointmentsClient({
  studentId,
  teacher,
  settings,
  rules,
  exceptions,
  initialAppointments,
  notes,
  decisions,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [appointments, setAppointments] = useState(initialAppointments);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const noteByAppointment = useMemo(() => {
    const m = new Map<number, VisibleNote>();
    for (const n of notes) m.set(n.appointment_id, n);
    return m;
  }, [notes]);

  const decisionsByAppointment = useMemo(() => {
    const m = new Map<number, StudentDecision[]>();
    for (const d of decisions) {
      const list = m.get(d.appointment_id) ?? [];
      list.push(d);
      m.set(d.appointment_id, list);
    }
    return m;
  }, [decisions]);

  const now = Date.now();
  const proposals = appointments.filter((a) => a.status === "proposed");
  const upcoming = appointments
    .filter(
      (a) =>
        ["pending", "confirmed", "in_progress"].includes(a.status) &&
        new Date(a.appointment_date).getTime() + a.duration_minutes * 60000 > now
    )
    .sort(
      (a, b) =>
        new Date(a.appointment_date).getTime() -
        new Date(b.appointment_date).getTime()
    );
  const past = appointments
    .filter((a) => !proposals.includes(a) && !upcoming.includes(a))
    .sort(
      (a, b) =>
        new Date(b.appointment_date).getTime() -
        new Date(a.appointment_date).getTime()
    );

  const updateLocal = (id: number, patch: Partial<StudentAppointment>) =>
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );

  const acceptProposal = async (a: StudentAppointment) => {
    if (!a.proposed_date) return;
    const patch = {
      appointment_date: a.proposed_date,
      status: "confirmed" as const,
      proposed_date: null,
    };
    updateLocal(a.id, patch);
    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: a.proposed_date,
        status: "confirmed",
        proposed_date: null,
        proposed_by: null,
      })
      .eq("id", a.id);
    if (error) {
      updateLocal(a.id, a);
      toast.error("İşlem başarısız: " + error.message);
    } else {
      toast.success("Önerilen saat kabul edildi, randevu onaylandı.");
    }
  };

  const cancelAppointment = async (a: StudentAppointment) => {
    updateLocal(a.id, { status: "cancelled" });
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", a.id);
    if (error) {
      updateLocal(a.id, { status: a.status });
      toast.error("İptal edilemedi: " + error.message);
    } else {
      toast.success("Randevu iptal edildi.");
    }
  };

  const apptCard = (a: StudentAppointment, actions?: React.ReactNode) => {
    const note = noteByAppointment.get(a.id);
    const apptDecisions = decisionsByAppointment.get(a.id) ?? [];
    const expanded = expandedId === a.id;
    const hasDetail =
      a.status === "completed" && (note || apptDecisions.length > 0);

    return (
      <div
        key={a.id}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
      >
        <div className="px-4 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 shrink-0">
            <span className="text-[var(--accent)] text-base font-black leading-none">
              {new Date(a.appointment_date).getDate()}
            </span>
            <span className="text-[var(--text-muted)] text-[9px] font-bold uppercase">
              {new Date(a.appointment_date).toLocaleDateString("tr-TR", {
                month: "short",
              })}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-bold">
              {MEETING_TYPE_LABELS[a.meeting_type] ?? a.meeting_type}
            </p>
            <p className="text-[var(--text-muted)] text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeTR(a.appointment_date)} · {a.duration_minutes} dk
              </span>
              <span className="inline-flex items-center gap-1">
                {FORMAT_ICONS[a.meeting_format]}
                {MEETING_FORMAT_LABELS[a.meeting_format]}
              </span>
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[a.status]}`}
          >
            {STATUS_LABELS[a.status]}
          </span>

          {hasDetail && (
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : a.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
              aria-label="Detay"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {a.status === "rejected" && a.rejection_reason && (
          <div className="px-4 pb-3 -mt-1">
            <p className="text-rose-300/80 text-xs">
              Ret nedeni: {a.rejection_reason}
            </p>
          </div>
        )}

        {actions && <div className="px-4 pb-3.5">{actions}</div>}

        {expanded && hasDetail && (
          <div className="border-t border-[var(--border)] px-4 py-4 space-y-3 bg-[var(--surface-2)]/50">
            {note?.subject_topic && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1">
                  Görüşmenin Konusu
                </p>
                <p className="text-[var(--text-secondary)] text-sm">{note.subject_topic}</p>
              </div>
            )}
            {note?.student_opinion && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1">
                  Öğrencinin Görüşleri
                </p>
                <p className="text-[var(--text-secondary)] text-sm">{note.student_opinion}</p>
              </div>
            )}
            {apptDecisions.length > 0 && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5" />
                  Alınan Kararlar ve Görevler
                </p>
                <ul className="space-y-1">
                  {apptDecisions.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                    >
                      {d.is_completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-[var(--border)] shrink-0" />
                      )}
                      <span className={d.is_completed ? "line-through opacity-60" : ""}>
                        {d.text_content}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {note?.next_meeting_date && (
              <p className="text-[var(--text-muted)] text-xs">
                Sonraki görüşme:{" "}
                <span className="text-[var(--text-secondary)] font-semibold">
                  {formatDateTR(`${note.next_meeting_date}T00:00:00`)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AppToaster />

      {/* Randevu Al */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setRescheduleId(null);
            setWizardOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-sm font-bold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] hover:shadow-[var(--primary)]/40 transition-all"
        >
          <CalendarPlus className="w-4.5 h-4.5" />
          Randevu Al
        </button>
      </div>

      {/* Öğretmen saat önerileri */}
      {proposals.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--accent)]" />
            Öğretmenin Yeni Saat Önerdi
          </h3>
          {proposals.map((a) =>
            apptCard(
              a,
              <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3 space-y-3">
                <p className="text-[var(--text-secondary)] text-xs">
                  Öğretmenin bu görüşme için{" "}
                  <span className="text-[var(--text-primary)] font-bold">
                    {a.proposed_date
                      ? `${formatDateTR(a.proposed_date)} ${formatTimeTR(a.proposed_date)}`
                      : "-"}
                  </span>{" "}
                  saatini önerdi.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => acceptProposal(a)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/40 text-[var(--success)] text-xs font-bold hover:bg-[var(--success)]/30 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kabul Et
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRescheduleId(a.id);
                      setWizardOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-xs font-bold hover:bg-[var(--primary)]/25 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Başka Saat Seç
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelAppointment(a)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/25 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    İptal Et
                  </button>
                </div>
              </div>
            )
          )}
        </section>
      )}

      {/* Yaklaşan randevular */}
      <section className="space-y-3">
        <h3 className="text-[var(--text-primary)] font-bold text-sm">
          Yaklaşan Randevular
        </h3>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              Yaklaşan randevun yok. Yukarıdaki butonla yeni bir randevu talebi
              oluşturabilirsin.
            </p>
          </div>
        ) : (
          upcoming.map((a) =>
            apptCard(
              a,
              ["pending", "confirmed"].includes(a.status) ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => cancelAppointment(a)}
                    className="text-rose-300/70 hover:text-rose-300 text-xs font-semibold transition-colors"
                  >
                    Randevuyu İptal Et
                  </button>
                </div>
              ) : undefined
            )
          )
        )}
      </section>

      {/* Geçmiş */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-[var(--text-muted)]" />
            Görüşme Geçmişi
          </h3>
          {past.map((a) => apptCard(a))}
        </section>
      )}

      <RequestWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        studentId={studentId}
        teacher={teacher}
        settings={settings}
        rules={rules}
        exceptions={exceptions}
        rescheduleId={rescheduleId}
        onSubmitted={() => {
          toast.success(
            rescheduleId
              ? "Yeni saat talebin öğretmenine iletildi."
              : "Randevu talebin gönderildi. Onay bekleniyor."
          );
          router.refresh();
          // Sunucudan taze veri gelene kadar listeyi yenile
          supabase
            .from("appointments")
            .select(
              "id, appointment_date, duration_minutes, status, notes, meeting_type, meeting_format, proposed_date, rejection_reason, created_at"
            )
            .eq("student_id", studentId)
            .order("appointment_date", { ascending: false })
            .then(({ data }) => {
              if (data) setAppointments(data as StudentAppointment[]);
            });
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}
