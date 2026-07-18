"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Video,
  Users2,
  Phone,
  PlayCircle,
  NotebookPen,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  STATUS_LABELS,
  formatTimeTR,
  type AppointmentStatus,
  type MeetingFormat,
} from "@/lib/appointments";
import AppToaster from "@/app/dashboard/_components/AppToaster";
import MeetingNoteModal, {
  type NoteModalAppointment,
} from "@/app/dashboard/teacher/_components/MeetingNoteModal";
import RequestDetailModal from "./RequestDetailModal";
import NewAppointmentModal from "./NewAppointmentModal";
import type { AppointmentRow, StudentOption } from "../page";

const FORMAT_ICONS: Record<MeetingFormat, React.ReactNode> = {
  online: <Video className="w-3.5 h-3.5" />,
  in_person: <Users2 className="w-3.5 h-3.5" />,
  phone: <Phone className="w-3.5 h-3.5" />,
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  proposed: "bg-[var(--primary-2)]/15 border-[var(--primary-2)]/30 text-[var(--accent)]",
  confirmed: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  in_progress: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  completed: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]",
  cancelled: "bg-rose-500/15 border-rose-500/30 text-rose-300",
  rejected: "bg-rose-500/15 border-rose-500/30 text-rose-300",
};

interface Props {
  initialAppointments: AppointmentRow[];
  students: StudentOption[];
  teacherId: string;
}

export default function TeacherAppointmentsClient({
  initialAppointments,
  students,
  teacherId,
}: Props) {
  const supabase = createClient();

  const [appointments, setAppointments] = useState(initialAppointments);
  const [detailAppt, setDetailAppt] = useState<AppointmentRow | null>(null);
  const [noteAppt, setNoteAppt] = useState<AppointmentRow | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const patch = (p: Partial<AppointmentRow> & { id: number }) =>
    setAppointments((prev) =>
      prev.map((a) => (a.id === p.id ? { ...a, ...p } : a))
    );

  const now = Date.now();

  const groups = useMemo(() => {
    const pending = appointments
      .filter((a) => a.status === "pending")
      .sort((x, y) => +new Date(x.appointment_date) - +new Date(y.appointment_date));
    const proposed = appointments.filter((a) => a.status === "proposed");
    const upcoming = appointments
      .filter((a) => ["confirmed", "in_progress"].includes(a.status))
      .sort((x, y) => +new Date(x.appointment_date) - +new Date(y.appointment_date));
    const completed = appointments
      .filter((a) => a.status === "completed")
      .sort((x, y) => +new Date(y.appointment_date) - +new Date(x.appointment_date))
      .slice(0, 10);
    return { pending, proposed, upcoming, completed };
  }, [appointments]);

  // ─── Yaşam döngüsü işlemleri ─────────────────────────────────────────────
  const startMeeting = async (a: AppointmentRow) => {
    patch({ id: a.id, status: "in_progress", started_at: new Date().toISOString() });
    const { error } = await supabase
      .from("appointments")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) {
      patch({ id: a.id, status: a.status, started_at: a.started_at });
      toast.error("Başlatılamadı: " + error.message);
    } else {
      toast.success(
        a.meeting_format === "phone"
          ? "Telefon görüşmesi işaretlendi."
          : "Görüşme başlatıldı."
      );
    }
  };

  const completeMeeting = (a: AppointmentRow) => {
    // Not ekranı açılır; kaydedilince durum 'completed' olur
    setNoteAppt(a);
  };

  // Görüşme başlatma butonu: randevu saatine 15 dk kala aktifleşir
  const canStart = (a: AppointmentRow) =>
    a.status === "confirmed" &&
    new Date(a.appointment_date).getTime() - now < 15 * 60 * 1000;

  const startLabel = (f: MeetingFormat) =>
    f === "online"
      ? "Görüşmeyi Başlat"
      : f === "in_person"
      ? "Görüşme Başladı"
      : "Telefon Görüşmesi Yapıldı";

  const toNoteAppointment = (a: AppointmentRow): NoteModalAppointment => ({
    id: a.id,
    appointment_date: a.appointment_date,
    duration_minutes: a.duration_minutes,
    meeting_type: a.meeting_type,
    meeting_format: a.meeting_format,
    student: a.student
      ? { id: a.student.id, full_name: a.student.full_name, grade: a.student.grade }
      : null,
  });

  const card = (a: AppointmentRow, actions?: React.ReactNode) => (
    <div
      key={a.id}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 shrink-0">
          <span className="text-[var(--accent)] text-base font-black leading-none">
            {new Date(a.appointment_date).getDate()}
          </span>
          <span className="text-[var(--text-muted)] text-[9px] font-bold uppercase">
            {new Date(a.appointment_date).toLocaleDateString("tr-TR", { month: "short" })}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-sm font-bold truncate">
            {a.student?.full_name ?? "Öğrenci"}
            {a.student?.grade && (
              <span className="text-[var(--text-muted)] font-normal text-xs ml-1.5">
                {a.student.grade}. sınıf
              </span>
            )}
          </p>
          <p className="text-[var(--text-muted)] text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span>{MEETING_TYPE_LABELS[a.meeting_type] ?? a.meeting_type}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeTR(a.appointment_date)} · {a.duration_minutes} dk
            </span>
            <span className="inline-flex items-center gap-1">
              {FORMAT_ICONS[a.meeting_format]}
              {MEETING_FORMAT_LABELS[a.meeting_format]}
            </span>
          </p>
          {a.notes && (
            <p className="text-[var(--text-secondary)] text-xs mt-1 line-clamp-1 italic">
              “{a.notes}”
            </p>
          )}
        </div>

        <span
          className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[a.status]}`}
        >
          {STATUS_LABELS[a.status]}
        </span>
      </div>
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  );

  const summaryChip = (
    icon: React.ReactNode,
    label: string,
    count: number,
    cls: string
  ) => (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${cls}`}
    >
      {icon}
      {label}
      <span className="font-normal tabular-nums text-[var(--text-muted)]">· {count}</span>
    </span>
  );

  return (
    <div className="space-y-6">
      <AppToaster />

      {/* Özet + yeni randevu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {summaryChip(
            <Hourglass className="w-4 h-4" />,
            "Onay Bekleyen",
            groups.pending.length,
            "bg-amber-500/15 border-amber-500/30 text-amber-300"
          )}
          {summaryChip(
            <Clock className="w-4 h-4" />,
            "Öneri Bekleyen",
            groups.proposed.length,
            "bg-[var(--primary-2)]/15 border-[var(--primary-2)]/30 text-[var(--accent)]"
          )}
          {summaryChip(
            <CalendarCheck className="w-4 h-4" />,
            "Onaylanan",
            groups.upcoming.length,
            "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
          )}
          {summaryChip(
            <CheckCircle2 className="w-4 h-4" />,
            "Tamamlanan",
            appointments.filter((a) => a.status === "completed").length,
            "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"
          )}
        </div>

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          disabled={students.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/25 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Yeni Randevu
        </button>
      </div>

      {/* Bekleyen talepler */}
      <section className="space-y-3">
        <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-amber-300" />
          Onay Bekleyen Talepler
        </h3>
        {groups.pending.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            Bekleyen randevu talebi yok.
          </p>
        ) : (
          groups.pending.map((a) =>
            card(
              a,
              <button
                type="button"
                onClick={() => setDetailAppt(a)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-xs font-bold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-all"
              >
                İncele ve Yanıtla
              </button>
            )
          )
        )}
      </section>

      {/* Öğrenci yanıtı bekleyen öneriler */}
      {groups.proposed.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            Öğrenci Yanıtı Bekleyen Öneriler
          </h3>
          {groups.proposed.map((a) =>
            card(
              a,
              <p className="text-[var(--text-muted)] text-xs">
                Önerilen saat:{" "}
                <span className="text-[var(--text-secondary)] font-semibold">
                  {a.proposed_date
                    ? `${new Date(a.proposed_date).toLocaleDateString("tr-TR")} ${formatTimeTR(a.proposed_date)}`
                    : "-"}
                </span>
              </p>
            )
          )}
        </section>
      )}

      {/* Onaylanan / süren */}
      <section className="space-y-3">
        <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-300" />
          Onaylanan Randevular
        </h3>
        {groups.upcoming.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            Onaylanmış randevu yok.
          </p>
        ) : (
          groups.upcoming.map((a) =>
            card(
              a,
              <>
                {canStart(a) && (
                  <button
                    type="button"
                    onClick={() => startMeeting(a)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {startLabel(a.meeting_format)}
                  </button>
                )}
                {a.status === "in_progress" && (
                  <button
                    type="button"
                    onClick={() => completeMeeting(a)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--success)]/20 border border-[var(--success)]/40 text-[var(--success)] text-xs font-bold hover:bg-[var(--success)]/30 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Görüşmeyi Tamamla
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    patch({ id: a.id, status: "cancelled" });
                    const { error } = await supabase
                      .from("appointments")
                      .update({ status: "cancelled" })
                      .eq("id", a.id);
                    if (error) {
                      patch({ id: a.id, status: a.status });
                      toast.error("İptal edilemedi: " + error.message);
                    } else toast.success("Randevu iptal edildi.");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-rose-300/70 hover:text-rose-300 text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  İptal
                </button>
              </>
            )
          )
        )}
      </section>

      {/* Son tamamlananlar */}
      {groups.completed.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-[var(--text-muted)]" />
            Son Tamamlanan Görüşmeler
          </h3>
          {groups.completed.map((a) =>
            card(
              a,
              <button
                type="button"
                onClick={() => setNoteAppt(a)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-xs font-bold hover:bg-[var(--primary)]/25 transition-colors"
              >
                <NotebookPen className="w-3.5 h-3.5" />
                Görüşme Notu
              </button>
            )
          )}
        </section>
      )}

      {/* Modallar */}
      <RequestDetailModal
        open={detailAppt !== null}
        onClose={() => setDetailAppt(null)}
        appointment={detailAppt}
        onUpdated={patch}
        onError={(m) => toast.error(m)}
        onSuccess={(m) => toast.success(m)}
      />

      <MeetingNoteModal
        open={noteAppt !== null}
        onClose={() => setNoteAppt(null)}
        appointment={noteAppt ? toNoteAppointment(noteAppt) : null}
        teacherId={teacherId}
        onSaved={() => {
          if (noteAppt) {
            patch({
              id: noteAppt.id,
              status: "completed",
              completed_at: new Date().toISOString(),
            });
          }
        }}
      />

      <NewAppointmentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        students={students}
        teacherId={teacherId}
        onCreated={(created) => {
          setAppointments((prev) => [...prev, created]);
          toast.success("Randevu oluşturuldu ve öğrenciye bildirildi.");
        }}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  );
}
