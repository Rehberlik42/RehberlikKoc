"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ListChecks,
  Users2,
  TrendingUp,
  GraduationCap,
  Circle,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MEETING_TYPE_LABELS,
  MEETING_FORMAT_LABELS,
  formatDateTR,
  type AppointmentStatus,
  type MeetingType,
  type MeetingFormat,
} from "@/lib/appointments";
import AppToaster from "@/app/dashboard/_components/AppToaster";
import PdfExportButton from "@/app/dashboard/_components/PdfExportButton";
import toast from "react-hot-toast";

// ─── Tipler ──────────────────────────────────────────────────────────────────
export interface ReportAppointment {
  id: number;
  appointment_date: string;
  duration_minutes: number;
  status: AppointmentStatus;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  student_id: string | null;
  student_name: string | null;
}

export interface ReportDecision {
  id: number;
  appointment_id: number;
  student_id: string;
  kind: "decision" | "task" | "follow_up";
  text_content: string;
  is_completed: boolean;
  created_at: string;
}

export interface ReportStudent {
  id: string;
  full_name: string;
  grade: string | null;
  taskTotal: number;
  taskDone: number;
  examCount: number;
}

type Period = "1" | "3" | "6" | "12";

const PERIODS: { id: Period; label: string }[] = [
  { id: "1", label: "Bu Ay" },
  { id: "3", label: "Son 3 Ay" },
  { id: "6", label: "Son 6 Ay" },
  { id: "12", label: "Son 12 Ay" },
];

const MONTHS_SHORT_TR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

const KIND_LABELS = {
  decision: "Karar",
  task: "Görev",
  follow_up: "Takip",
} as const;

const cardCls =
  "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5";

interface Props {
  appointments: ReportAppointment[];
  decisions: ReportDecision[];
  students: ReportStudent[];
  teacherName: string;
}

export default function ReportsClient({
  appointments,
  decisions,
  students,
  teacherName,
}: Props) {
  const [period, setPeriod] = useState<Period>("3");
  const [studentFilter, setStudentFilter] = useState("");

  // ─── Dönem + öğrenci filtresi ────────────────────────────────────────────
  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === "1") return new Date(d.getFullYear(), d.getMonth(), 1);
    d.setMonth(d.getMonth() - Number(period));
    return d;
  }, [period]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          new Date(a.appointment_date) >= periodStart &&
          (!studentFilter || a.student_id === studentFilter)
      ),
    [appointments, periodStart, studentFilter]
  );

  const filteredDecisions = useMemo(
    () =>
      decisions.filter(
        (d) =>
          new Date(d.created_at) >= periodStart &&
          (!studentFilter || d.student_id === studentFilter)
      ),
    [decisions, periodStart, studentFilter]
  );

  // ─── KPI'lar ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter((a) => a.status === "completed");
    const cancelled = filteredAppointments.filter((a) =>
      ["cancelled", "rejected"].includes(a.status)
    ).length;
    const upcoming = filteredAppointments.filter((a) =>
      ["pending", "proposed", "confirmed", "in_progress"].includes(a.status)
    ).length;
    const totalMinutes = completed.reduce((s, a) => s + a.duration_minutes, 0);
    const openDecisions = filteredDecisions.filter((d) => !d.is_completed).length;
    const doneDecisions = filteredDecisions.filter((d) => d.is_completed).length;
    const parentMeetings = filteredAppointments.filter((a) =>
      ["parent", "joint"].includes(a.meeting_type)
    );
    return {
      total,
      completedCount: completed.length,
      cancelled,
      upcoming,
      totalMinutes,
      openDecisions,
      doneDecisions,
      parentMeetings,
    };
  }, [filteredAppointments, filteredDecisions]);

  // ─── Aylık trend ─────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const buckets = new Map<string, { label: string; tamamlanan: number; diger: number }>();
    const months = Math.max(Number(period), 1);
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, {
        label: `${MONTHS_SHORT_TR[d.getMonth()]}${months > 6 ? ` '${String(d.getFullYear()).slice(2)}` : ""}`,
        tamamlanan: 0,
        diger: 0,
      });
    }
    for (const a of filteredAppointments) {
      const d = new Date(a.appointment_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (a.status === "completed") bucket.tamamlanan += 1;
      else if (!["cancelled", "rejected"].includes(a.status)) bucket.diger += 1;
    }
    return Array.from(buckets.values());
  }, [filteredAppointments, period]);

  // ─── Tür ve şekil dağılımı ───────────────────────────────────────────────
  const typeDistribution = useMemo(() => {
    const counts = new Map<MeetingType, number>();
    for (const a of filteredAppointments) {
      counts.set(a.meeting_type, (counts.get(a.meeting_type) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return (Object.keys(MEETING_TYPE_LABELS) as MeetingType[])
      .map((t) => ({ type: t, label: MEETING_TYPE_LABELS[t], count: counts.get(t) ?? 0, max }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredAppointments]);

  const formatDistribution = useMemo(() => {
    const counts = new Map<MeetingFormat, number>();
    for (const a of filteredAppointments) {
      counts.set(a.meeting_format, (counts.get(a.meeting_format) ?? 0) + 1);
    }
    return (Object.keys(MEETING_FORMAT_LABELS) as MeetingFormat[]).map((f) => ({
      label: MEETING_FORMAT_LABELS[f],
      count: counts.get(f) ?? 0,
    }));
  }, [filteredAppointments]);

  // ─── Açık kararlar (öğrenciye göre gruplu) ───────────────────────────────
  const openDecisionsByStudent = useMemo(() => {
    const nameById = new Map(students.map((s) => [s.id, s.full_name]));
    const groups = new Map<string, ReportDecision[]>();
    for (const d of filteredDecisions) {
      if (d.is_completed) continue;
      const list = groups.get(d.student_id) ?? [];
      list.push(d);
      groups.set(d.student_id, list);
    }
    return Array.from(groups.entries())
      .map(([id, items]) => ({
        studentId: id,
        studentName: nameById.get(id) ?? "Öğrenci",
        items,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filteredDecisions, students]);

  // ─── Öğrenci gelişim özeti ───────────────────────────────────────────────
  const studentRows = useMemo(() => {
    return students
      .filter((s) => !studentFilter || s.id === studentFilter)
      .map((s) => {
        const meetings = filteredAppointments.filter((a) => a.student_id === s.id);
        const completedMeetings = meetings.filter((a) => a.status === "completed").length;
        const sDecisions = filteredDecisions.filter((d) => d.student_id === s.id);
        const open = sDecisions.filter((d) => !d.is_completed).length;
        const taskPct = s.taskTotal > 0 ? Math.round((s.taskDone / s.taskTotal) * 100) : null;
        return {
          ...s,
          meetingCount: meetings.length,
          completedMeetings,
          openDecisions: open,
          closedDecisions: sDecisions.length - open,
          taskPct,
        };
      })
      .sort((a, b) => b.meetingCount - a.meetingCount);
  }, [students, studentFilter, filteredAppointments, filteredDecisions]);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  const kpi = (
    icon: React.ReactNode,
    label: string,
    value: string | number,
    sub?: string
  ) => (
    <div className={`${cardCls} flex items-center gap-3.5`}>
      <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary)]/12 border border-[var(--primary)]/25 flex items-center justify-center text-[var(--accent)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[var(--text-primary)] text-xl font-black tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-[var(--text-muted)] text-[11px] font-semibold">{label}</p>
        {sub && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AppToaster />

      {/* Filtre şeridi + PDF */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[var(--text-muted)]" />
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              period === p.id
                ? "bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--accent)]"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <select
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          className="px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold focus:outline-none focus:border-[var(--primary)]/50"
        >
          <option value="">Tüm Öğrenciler</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <PdfExportButton
            targetId="reports-export-root"
            filenamePrefix="MINDORA-Gorusme-Raporu"
            reportTitle={`Görüşme Raporu · ${periodLabel} · ${teacherName}`}
            onToast={(msg, type) =>
              type === "error" ? toast.error(msg) : toast.success(msg)
            }
          />
        </div>
      </div>

      <div id="reports-export-root" className="space-y-6">
        {/* KPI kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpi(<CalendarCheck className="w-4.5 h-4.5" />, "Toplam Görüşme", stats.total, periodLabel)}
          {kpi(
            <CheckCircle2 className="w-4.5 h-4.5" />,
            "Tamamlanan",
            stats.completedCount,
            `${Math.round(stats.totalMinutes / 60)} saat ${stats.totalMinutes % 60} dk görüşme`
          )}
          {kpi(<Clock className="w-4.5 h-4.5" />, "Planlanan / Bekleyen", stats.upcoming)}
          {kpi(<XCircle className="w-4.5 h-4.5" />, "İptal / Ret", stats.cancelled)}
        </div>

        {/* Aylık trend + tür dağılımı */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className={`${cardCls} lg:col-span-3`}>
            <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              Aylık Görüşme Trendi
            </h3>
            {stats.total === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-8 text-center">
                Bu dönemde görüşme kaydı yok.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(123,47,255,0.08)" }}
                    contentStyle={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="tamamlanan"
                    name="Tamamlanan"
                    stackId="a"
                    fill="var(--primary)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="diger"
                    name="Planlanan"
                    stackId="a"
                    fill="var(--primary-2)"
                    fillOpacity={0.45}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className={`${cardCls} lg:col-span-2 space-y-4`}>
            <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[var(--accent)]" />
              Görüşme Türü Dağılımı
            </h3>
            {typeDistribution.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-4 text-center">Veri yok.</p>
            ) : (
              <ul className="space-y-2.5">
                {typeDistribution.map((r) => (
                  <li key={r.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)] font-semibold">{r.label}</span>
                      <span className="text-[var(--text-primary)] font-bold tabular-nums">
                        {r.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)]"
                        style={{ width: `${(r.count / r.max) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
              {formatDistribution.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
                >
                  {f.label}
                  <span className="text-[var(--text-primary)] font-bold tabular-nums">
                    {f.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Veli görüşmeleri */}
        <div className={cardCls}>
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2 mb-3">
            <Users2 className="w-4 h-4 text-[var(--accent)]" />
            Veli Görüşme Raporu
            <span className="text-[var(--text-muted)] font-normal text-xs">
              · {periodLabel} içinde {stats.parentMeetings.length} veli/ortak görüşme
            </span>
          </h3>
          {stats.parentMeetings.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              Bu dönemde veli veya ortak görüşme yapılmamış.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stats.parentMeetings.slice(0, 8).map((a) => (
                <li key={a.id} className="py-2.5 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-[var(--text-primary)] font-semibold flex-1 min-w-0 truncate">
                    {a.student_name ?? "Öğrenci"}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs">
                    {MEETING_TYPE_LABELS[a.meeting_type]}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs tabular-nums">
                    {formatDateTR(a.appointment_date, { weekday: undefined })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      a.status === "completed"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {a.status === "completed" ? "Tamamlandı" : "Planlandı"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tamamlanmayan kararlar */}
        <div className={cardCls}>
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2 mb-3">
            <Circle className="w-4 h-4 text-amber-300" />
            Tamamlanmayan Kararlar ve Görevler
            <span className="text-[var(--text-muted)] font-normal text-xs">
              · {stats.openDecisions} açık / {stats.doneDecisions} tamamlanmış
            </span>
          </h3>
          {openDecisionsByStudent.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">
              Açık karar veya görev yok — her şey tamamlanmış. 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {openDecisionsByStudent.map((g) => (
                <div key={g.studentId}>
                  <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider mb-1.5">
                    {g.studentName}
                    <span className="text-[var(--text-muted)] font-normal normal-case ml-1.5">
                      ({g.items.length} açık madde)
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {g.items.map((d) => (
                      <li key={d.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            d.kind === "task"
                              ? "bg-[var(--primary)]/12 border-[var(--primary)]/30 text-[var(--accent)]"
                              : d.kind === "follow_up"
                              ? "bg-cyan-500/12 border-cyan-500/30 text-cyan-300"
                              : "bg-amber-500/12 border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {KIND_LABELS[d.kind]}
                        </span>
                        <span className="flex-1 min-w-0 truncate">{d.text_content}</span>
                        <span className="text-[var(--text-muted)] text-[10px] tabular-nums shrink-0">
                          {new Date(d.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Öğrenci gelişim özeti */}
        <div className={cardCls}>
          <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
            Öğrenci Gelişim Özeti
            <span className="text-[var(--text-muted)] font-normal text-xs">· {periodLabel}</span>
          </h3>
          {studentRows.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">Öğrenci bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider border-b border-[var(--border)]">
                    <th className="py-2 pr-3">Öğrenci</th>
                    <th className="py-2 px-3 text-center">Görüşme</th>
                    <th className="py-2 px-3 text-center">Tamamlanan</th>
                    <th className="py-2 px-3 text-center">Açık Karar</th>
                    <th className="py-2 px-3 text-center">Görev Tamamlama</th>
                    <th className="py-2 pl-3 text-center">Deneme</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((s) => (
                    <tr key={s.id} className="border-b border-[var(--border)]/50 last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="text-[var(--text-primary)] font-semibold">
                          {s.full_name}
                        </span>
                        {s.grade && (
                          <span className="text-[var(--text-muted)] text-xs ml-1.5">
                            {s.grade}. sınıf
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-[var(--text-secondary)]">
                        {s.meetingCount}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-[var(--text-secondary)]">
                        {s.completedMeetings}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {s.openDecisions > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tabular-nums">
                            {s.openDecisions}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {s.taskPct === null ? (
                          <span className="block text-center text-[var(--text-muted)]">—</span>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.taskPct >= 70
                                    ? "bg-emerald-400"
                                    : s.taskPct >= 40
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                                }`}
                                style={{ width: `${s.taskPct}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-[var(--text-secondary)] w-9">
                              %{s.taskPct}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 text-center tabular-nums text-[var(--text-secondary)]">
                        {s.examCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
