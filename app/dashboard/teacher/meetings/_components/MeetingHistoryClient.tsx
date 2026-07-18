"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronDown,
  Filter,
  NotebookPen,
  CheckCircle2,
  Circle,
  Eye,
  ListChecks,
  ClipboardList,
  Lock,
} from "lucide-react";
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
import AppToaster from "@/app/dashboard/_components/AppToaster";
import MeetingNoteModal, {
  type NoteModalAppointment,
} from "@/app/dashboard/teacher/_components/MeetingNoteModal";

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface MeetingDecisionRecord {
  id: number;
  kind: "decision" | "task" | "follow_up";
  text_content: string;
  is_completed: boolean;
  study_plan_task_id: number | null;
}

export interface MeetingRecord {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  student: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    grade: string | null;
  } | null;
  subject_topic: string | null;
  student_opinion: string | null;
  parent_opinion: string | null;
  visibility: string | null;
  next_meeting_date: string | null;
  evaluation: string | null;
  decisions: MeetingDecisionRecord[];
}

interface Props {
  records: MeetingRecord[];
  students: { id: string; full_name: string | null }[];
  teacherId: string;
}

const inputCls =
  "px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors [color-scheme:dark]";

export default function MeetingHistoryClient({ records, students, teacherId }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openFollowUpsOnly, setOpenFollowUpsOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editRecord, setEditRecord] = useState<MeetingRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return records.filter((r) => {
      if (studentFilter && r.student?.id !== studentFilter) return false;
      if (typeFilter && r.meeting_type !== typeFilter) return false;
      if (dateFrom && r.appointment_date.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.appointment_date.slice(0, 10) > dateTo) return false;
      if (
        openFollowUpsOnly &&
        !r.decisions.some((d) => !d.is_completed)
      )
        return false;
      if (q) {
        const haystack = [
          r.student?.full_name,
          r.subject_topic,
          r.student_opinion,
          r.parent_opinion,
          r.evaluation,
          ...r.decisions.map((d) => d.text_content),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("tr-TR");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, search, studentFilter, typeFilter, dateFrom, dateTo, openFollowUpsOnly]);

  const toNoteAppointment = (r: MeetingRecord): NoteModalAppointment => ({
    id: r.id,
    appointment_date: r.appointment_date,
    duration_minutes: r.duration_minutes,
    meeting_type: r.meeting_type,
    meeting_format: r.meeting_format,
    student: r.student
      ? { id: r.student.id, full_name: r.student.full_name, grade: r.student.grade }
      : null,
  });

  const textBlock = (label: string, value: string | null, locked = false) =>
    value ? (
      <div>
        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
          {locked && <Lock className="w-3 h-3 text-amber-300" />}
          {label}
        </p>
        <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;

  const decisionList = (
    r: MeetingRecord,
    kind: MeetingDecisionRecord["kind"],
    label: string,
    icon: React.ReactNode
  ) => {
    const items = r.decisions.filter((d) => d.kind === kind);
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
          {icon}
          {label}
        </p>
        <ul className="space-y-1">
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              {d.is_completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              )}
              <span className={d.is_completed ? "line-through opacity-60" : ""}>
                {d.text_content}
              </span>
              {d.study_plan_task_id && (
                <span className="text-[var(--success)] text-[9px] font-bold uppercase tracking-wider">
                  Programda
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <AppToaster />

      {/* Filtreler */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Notlarda ara: motivasyon, telefon, matematik, devamsızlık…"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className={inputCls}
          >
            <option value="">Tüm Öğrenciler</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "İsimsiz"}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={inputCls}
          >
            <option value="">Tüm Görüşme Türleri</option>
            {(Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map((t) => (
              <option key={t} value={t}>
                {MEETING_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputCls}
            title="Başlangıç tarihi"
          />
          <span className="text-[var(--text-muted)] text-xs">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputCls}
            title="Bitiş tarihi"
          />
          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={openFollowUpsOnly}
              onChange={(e) => setOpenFollowUpsOnly(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Açık takip maddesi olanlar
          </label>
        </div>
      </div>

      {/* Kronolojik liste */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Kriterlere uyan görüşme kaydı bulunamadı.
          </p>
        </div>
      ) : (
        <div className="relative space-y-3">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const openCount = r.decisions.filter((d) => !d.is_completed).length;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="w-full px-4 py-3.5 flex flex-wrap items-center gap-3 text-left hover:bg-[var(--surface-2)]/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 shrink-0">
                    <span className="text-[var(--accent)] text-base font-black leading-none">
                      {new Date(r.appointment_date).getDate()}
                    </span>
                    <span className="text-[var(--text-muted)] text-[9px] font-bold uppercase">
                      {new Date(r.appointment_date).toLocaleDateString("tr-TR", {
                        month: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-bold truncate">
                      {r.student?.full_name ?? "Öğrenci"}
                      <span className="text-[var(--text-muted)] font-normal text-xs ml-2">
                        {MEETING_TYPE_LABELS[r.meeting_type]}
                      </span>
                    </p>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">
                      {formatDateTR(r.appointment_date)} · {formatTimeTR(r.appointment_date)} ·{" "}
                      {MEETING_FORMAT_LABELS[r.meeting_format]}
                      {r.subject_topic && (
                        <span className="text-[var(--text-secondary)]"> — {r.subject_topic}</span>
                      )}
                    </p>
                  </div>

                  {openCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      {openCount} açık madde
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expanded && (
                  <div className="border-t border-[var(--border)] px-4 py-4 space-y-4 bg-[var(--surface-2)]/40">
                    {textBlock("Görüşmenin Konusu", r.subject_topic)}
                    {textBlock("Öğrencinin Görüşleri", r.student_opinion)}
                    {textBlock("Velinin Görüşleri", r.parent_opinion)}
                    {textBlock("Öğretmenin Değerlendirmesi (özel)", r.evaluation, true)}
                    {decisionList(r, "decision", "Alınan Kararlar", <ListChecks className="w-3.5 h-3.5" />)}
                    {decisionList(r, "task", "Öğrenciye Verilen Görevler", <ClipboardList className="w-3.5 h-3.5" />)}
                    {decisionList(r, "follow_up", "Takip Edilecek Konular", <Eye className="w-3.5 h-3.5" />)}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                      <p className="text-[var(--text-muted)] text-xs">
                        Görünürlük:{" "}
                        <span className="text-[var(--text-secondary)] font-semibold">
                          {VISIBILITY_LABELS[(r.visibility as NoteVisibility) ?? "teacher"]}
                        </span>
                        {r.next_meeting_date && (
                          <>
                            {" · "}Sonraki görüşme:{" "}
                            <span className="text-[var(--text-secondary)] font-semibold">
                              {formatDateTR(`${r.next_meeting_date}T00:00:00`)}
                            </span>
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditRecord(r)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--accent)] text-xs font-bold hover:bg-[var(--primary)]/25 transition-colors"
                      >
                        <NotebookPen className="w-3.5 h-3.5" />
                        Notu Düzenle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MeetingNoteModal
        open={editRecord !== null}
        onClose={() => setEditRecord(null)}
        appointment={editRecord ? toNoteAppointment(editRecord) : null}
        teacherId={teacherId}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
