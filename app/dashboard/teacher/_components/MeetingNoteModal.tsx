"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  X,
  Loader2,
  Save,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Eye,
  ListChecks,
  ClipboardList,
  NotebookPen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  VISIBILITY_LABELS,
  formatDateTR,
  formatTimeTR,
  type MeetingType,
  type MeetingFormat,
  type NoteVisibility,
} from "@/lib/appointments";

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface NoteModalAppointment {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  student: { id: string; full_name: string | null; grade: string | null } | null;
}

export interface DecisionRow {
  id: number;
  kind: "decision" | "task" | "follow_up";
  text_content: string;
  is_completed: boolean;
  study_plan_task_id: number | null;
}

interface NoteData {
  subject_topic: string;
  student_opinion: string;
  parent_opinion: string;
  visibility: NoteVisibility;
  next_meeting_date: string;
}

const EMPTY_NOTE: NoteData = {
  subject_topic: "",
  student_opinion: "",
  parent_opinion: "",
  visibility: "teacher",
  next_meeting_date: "",
};

const KIND_META: Record<
  DecisionRow["kind"],
  { label: string; icon: React.ReactNode; placeholder: string }
> = {
  decision: {
    label: "Alınan Kararlar",
    icon: <ListChecks className="w-4 h-4" />,
    placeholder: "Örn. Haftada 2 branş denemesi çözülecek",
  },
  task: {
    label: "Öğrenciye Verilen Görevler",
    icon: <ClipboardList className="w-4 h-4" />,
    placeholder: "Örn. Problemlerden 60 soru çözülecek",
  },
  follow_up: {
    label: "Takip Edilecek Konular",
    icon: <Eye className="w-4 h-4" />,
    placeholder: "Örn. Telefon kullanım süresi",
  },
};

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors [color-scheme:dark]";

const labelCls =
  "text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wider block mb-1.5";

interface Props {
  open: boolean;
  onClose: () => void;
  appointment: NoteModalAppointment | null;
  teacherId: string;
  /** Kaydetme sonrasında liste güncellensin diye */
  onSaved: () => void;
}

export default function MeetingNoteModal({
  open,
  onClose,
  appointment,
  teacherId,
  onSaved,
}: Props) {
  const supabase = createClient();

  const [note, setNote] = useState<NoteData>(EMPTY_NOTE);
  const [evaluation, setEvaluation] = useState("");
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [newItemText, setNewItemText] = useState<Record<DecisionRow["kind"], string>>({
    decision: "",
    task: "",
    follow_up: "",
  });
  const [sendingToProgramId, setSendingToProgramId] = useState<number | null>(null);
  const [programDate, setProgramDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Mevcut not + kararları yükle
  const loadExisting = useCallback(async () => {
    if (!appointment) return;
    setLoading(true);
    const [noteRes, privRes, decRes] = await Promise.all([
      supabase
        .from("meeting_notes")
        .select("subject_topic, student_opinion, parent_opinion, visibility, next_meeting_date")
        .eq("appointment_id", appointment.id)
        .maybeSingle(),
      supabase
        .from("meeting_private_notes")
        .select("evaluation")
        .eq("appointment_id", appointment.id)
        .maybeSingle(),
      supabase
        .from("meeting_decisions")
        .select("id, kind, text_content, is_completed, study_plan_task_id")
        .eq("appointment_id", appointment.id)
        .order("created_at"),
    ]);
    setLoading(false);

    setNote({
      subject_topic: noteRes.data?.subject_topic ?? "",
      student_opinion: noteRes.data?.student_opinion ?? "",
      parent_opinion: noteRes.data?.parent_opinion ?? "",
      visibility: (noteRes.data?.visibility as NoteVisibility) ?? "teacher",
      next_meeting_date: noteRes.data?.next_meeting_date ?? "",
    });
    setEvaluation(privRes.data?.evaluation ?? "");
    setDecisions((decRes.data ?? []) as DecisionRow[]);
  }, [appointment, supabase]);

  useEffect(() => {
    if (open && appointment) {
      loadExisting();
      setSendingToProgramId(null);
      setProgramDate(new Date().toISOString().slice(0, 10));
      setNewItemText({ decision: "", task: "", follow_up: "" });
    }
  }, [open, appointment, loadExisting]);

  if (!open || !mounted || !appointment) return null;

  const student = appointment.student;

  const addDecision = async (kind: DecisionRow["kind"]) => {
    const text = newItemText[kind].trim();
    if (!text || !student) return;
    const { data, error } = await supabase
      .from("meeting_decisions")
      .insert({
        appointment_id: appointment.id,
        student_id: student.id,
        teacher_id: teacherId,
        kind,
        text_content: text,
      })
      .select("id, kind, text_content, is_completed, study_plan_task_id")
      .single();
    if (error || !data) {
      toast.error("Eklenemedi: " + (error?.message ?? ""));
      return;
    }
    setDecisions((prev) => [...prev, data as DecisionRow]);
    setNewItemText((prev) => ({ ...prev, [kind]: "" }));
  };

  const removeDecision = async (id: number) => {
    const prev = decisions;
    setDecisions((d) => d.filter((x) => x.id !== id));
    const { error } = await supabase.from("meeting_decisions").delete().eq("id", id);
    if (error) {
      setDecisions(prev);
      toast.error("Silinemedi: " + error.message);
    }
  };

  const toggleDecision = async (d: DecisionRow) => {
    const next = !d.is_completed;
    setDecisions((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, is_completed: next } : x))
    );
    const { error } = await supabase
      .from("meeting_decisions")
      .update({
        is_completed: next,
        completed_at: next ? new Date().toISOString() : null,
      })
      .eq("id", d.id);
    if (error) {
      setDecisions((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, is_completed: !next } : x))
      );
      toast.error("Güncellenemedi: " + error.message);
    }
  };

  const sendToProgram = async (d: DecisionRow) => {
    if (!student || !programDate) return;
    const { data, error } = await supabase
      .from("study_plan_tasks")
      .insert({
        student_id: student.id,
        teacher_id: teacherId,
        plan_date: programDate,
        task_type: "ders",
        title: d.text_content.slice(0, 120),
        order_index: 99,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Programa gönderilemedi: " + (error?.message ?? ""));
      return;
    }
    const { error: linkError } = await supabase
      .from("meeting_decisions")
      .update({ study_plan_task_id: data.id })
      .eq("id", d.id);
    if (linkError) {
      toast.error("Görev oluşturuldu ama bağlanamadı: " + linkError.message);
    }
    setDecisions((prev) =>
      prev.map((x) =>
        x.id === d.id ? { ...x, study_plan_task_id: data.id as number } : x
      )
    );
    setSendingToProgramId(null);
    toast.success("Görev haftalık programa eklendi.");
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);

    const notePayload = {
      appointment_id: appointment.id,
      teacher_id: teacherId,
      student_id: student.id,
      subject_topic: note.subject_topic.trim() || null,
      student_opinion: note.student_opinion.trim() || null,
      parent_opinion: note.parent_opinion.trim() || null,
      visibility: note.visibility,
      next_meeting_date: note.next_meeting_date || null,
      updated_at: new Date().toISOString(),
    };

    const [noteRes, privRes, apptRes] = await Promise.all([
      supabase.from("meeting_notes").upsert(notePayload, { onConflict: "appointment_id" }),
      supabase.from("meeting_private_notes").upsert(
        {
          appointment_id: appointment.id,
          teacher_id: teacherId,
          evaluation: evaluation.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "appointment_id" }
      ),
      supabase
        .from("appointments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", appointment.id)
        .neq("status", "completed"),
    ]);

    setSaving(false);
    const err = noteRes.error ?? privRes.error ?? apptRes.error;
    if (err) {
      toast.error("Kaydedilemedi: " + err.message);
      return;
    }
    toast.success("Görüşme notu kaydedildi.");
    onSaved();
    onClose();
  };

  const decisionSection = (kind: DecisionRow["kind"]) => {
    const meta = KIND_META[kind];
    const items = decisions.filter((d) => d.kind === kind);
    return (
      <div key={kind}>
        <label className={`${labelCls} flex items-center gap-1.5`}>
          {meta.icon}
          {meta.label}
        </label>
        <ul className="space-y-1.5 mb-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <button
                type="button"
                onClick={() => toggleDecision(d)}
                className="shrink-0"
                title={d.is_completed ? "Tamamlandı" : "Tamamlandı işaretle"}
              >
                {d.is_completed ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <span className="block w-4 h-4 rounded-full border-2 border-[var(--border)] hover:border-[var(--success)] transition-colors" />
                )}
              </button>
              <span
                className={`flex-1 text-sm ${
                  d.is_completed
                    ? "text-[var(--text-muted)] line-through"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {d.text_content}
              </span>

              {kind !== "follow_up" &&
                (d.study_plan_task_id ? (
                  <span className="text-[var(--success)] text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Programda
                  </span>
                ) : sendingToProgramId === d.id ? (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="date"
                      value={programDate}
                      onChange={(e) => setProgramDate(e.target.value)}
                      className="px-2 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-xs [color-scheme:dark]"
                    />
                    <button
                      type="button"
                      onClick={() => sendToProgram(d)}
                      className="px-2 py-1 rounded-md bg-[var(--primary)]/20 border border-[var(--primary)]/40 text-[var(--accent)] text-[10px] font-bold"
                    >
                      Gönder
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSendingToProgramId(d.id)}
                    className="inline-flex items-center gap-1 text-[var(--accent)] text-[10px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity shrink-0"
                    title="Haftalık programa görev olarak ekle"
                  >
                    <Send className="w-3 h-3" />
                    Programa Gönder
                  </button>
                ))}

              <button
                type="button"
                onClick={() => removeDecision(d.id)}
                className="text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText[kind]}
            onChange={(e) =>
              setNewItemText((prev) => ({ ...prev, [kind]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDecision(kind);
              }
            }}
            placeholder={meta.placeholder}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => addDecision(kind)}
            className="shrink-0 px-3 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] hover:bg-[var(--primary)]/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface)]/95 backdrop-blur flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center text-[var(--accent)]">
              <NotebookPen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] text-base font-bold">Görüşme Notu</h3>
              <p className="text-[var(--text-muted)] text-[11px]">
                {student?.full_name ?? "Öğrenci"} ·{" "}
                {MEETING_TYPE_LABELS[appointment.meeting_type]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            aria-label="Kapat"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Genel bilgiler */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[var(--text-muted)] font-semibold mb-0.5">Tarih</p>
                <p className="text-[var(--text-primary)] font-bold">
                  {formatDateTR(appointment.appointment_date, { weekday: undefined })}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] font-semibold mb-0.5">Saat</p>
                <p className="text-[var(--text-primary)] font-bold">
                  {formatTimeTR(appointment.appointment_date)} · {appointment.duration_minutes} dk
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] font-semibold mb-0.5">Şekli</p>
                <p className="text-[var(--text-primary)] font-bold">
                  {MEETING_FORMAT_LABELS[appointment.meeting_format]}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] font-semibold mb-0.5">Katılımcılar</p>
                <p className="text-[var(--text-primary)] font-bold">
                  {student?.full_name ?? "Öğrenci"}
                  {student?.grade ? ` (${student.grade}. sınıf)` : ""}
                </p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Görüşmenin Konusu</label>
              <textarea
                value={note.subject_topic}
                onChange={(e) => setNote((n) => ({ ...n, subject_topic: e.target.value }))}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Örn. Son TYT denemesinin değerlendirilmesi ve program revizesi"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Öğrencinin Görüşleri</label>
                <textarea
                  value={note.student_opinion}
                  onChange={(e) => setNote((n) => ({ ...n, student_opinion: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Velinin Görüşleri</label>
                <textarea
                  value={note.parent_opinion}
                  onChange={(e) => setNote((n) => ({ ...n, parent_opinion: e.target.value }))}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Öğretmenin Değerlendirmesi{" "}
                <span className="text-[var(--text-muted)] font-normal normal-case">
                  (her zaman özeldir, öğrenci/veli göremez)
                </span>
              </label>
              <textarea
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none border-amber-500/20 focus:border-amber-500/40 focus:ring-amber-500/15`}
              />
            </div>

            {decisionSection("decision")}
            {decisionSection("task")}
            {decisionSection("follow_up")}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Eye className="w-3.5 h-3.5" />
                  Notun Görünürlüğü
                </label>
                <select
                  value={note.visibility}
                  onChange={(e) =>
                    setNote((n) => ({ ...n, visibility: e.target.value as NoteVisibility }))
                  }
                  className={inputCls}
                >
                  {(Object.keys(VISIBILITY_LABELS) as NoteVisibility[]).map((v) => (
                    <option key={v} value={v}>
                      {VISIBILITY_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sonraki Görüşme Tarihi</label>
                <input
                  type="date"
                  value={note.next_meeting_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setNote((n) => ({ ...n, next_meeting_date: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-all disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Kaydet ve Tamamla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
