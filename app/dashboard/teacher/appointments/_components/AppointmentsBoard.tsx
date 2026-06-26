"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Plus,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow, StudentOption } from "../page";
import AppointmentColumn from "./AppointmentColumn";
import AppointmentCard from "./AppointmentCard";
import NewAppointmentModal from "./NewAppointmentModal";

// ─── Durum tanımları ──────────────────────────────────────────────────────────
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface ColumnDef {
  id: AppointmentStatus;
  label: string;
  icon: React.ReactNode;
  accent: string;     // metin rengi
  ring: string;       // border rengi
  badgeBg: string;    // badge bg
  glow: string;       // sürükleme over efektinde glow rengi
}

export const COLUMNS: ColumnDef[] = [
  {
    id: "pending",
    label: "Bekleyenler",
    icon: <Clock className="w-4 h-4" />,
    accent: "text-amber-300",
    ring: "border-amber-500/30",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    glow: "rgba(245,158,11,0.35)",
  },
  {
    id: "confirmed",
    label: "Onaylananlar",
    icon: <CalendarCheck className="w-4 h-4" />,
    accent: "text-[var(--accent)]",
    ring: "border-[var(--primary-2)]/30",
    badgeBg: "bg-[var(--primary-2)]/15 border-[var(--primary-2)]/30 text-[var(--accent)]",
    glow: "rgba(79,124,255,0.35)",
  },
  {
    id: "completed",
    label: "Tamamlananlar",
    icon: <CheckCircle2 className="w-4 h-4" />,
    accent: "text-emerald-300",
    ring: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    glow: "rgba(16,185,129,0.35)",
  },
  {
    id: "cancelled",
    label: "İptal Edilenler",
    icon: <XCircle className="w-4 h-4" />,
    accent: "text-rose-300",
    ring: "border-rose-500/30",
    badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    glow: "rgba(244,63,94,0.35)",
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string };

function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const fadeTimer = setTimeout(() => setVisible(false), 3200);
    const closeTimer = setTimeout(onClose, 3500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose, toast]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-2xl transition-opacity duration-300 animate-in slide-in-from-bottom-4 ${
        visible ? "opacity-100" : "opacity-0"
      } ${
        toast.type === "success"
          ? "border-green-500/30 bg-[#0d1f0d] text-green-400 shadow-green-500/10"
          : "border-red-500/30 bg-[#1f0d0d] text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="h-4.5 w-4.5 shrink-0" />
      ) : (
        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

function StatusSummaryBadge({
  column,
  count,
}: {
  column: ColumnDef;
  count: number;
}) {
  const prevCount = useRef(count);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prevCount.current !== count) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 220);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-transform duration-200 hover:scale-[1.02] ${column.badgeBg}`}
    >
      {column.icon}
      {column.label}
      <span
        className={`font-normal tabular-nums text-[var(--text-muted)] transition-transform duration-200 ${
          pop ? "scale-125 text-[var(--text-secondary)]" : "scale-100"
        }`}
      >
        · {count}
      </span>
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  initialAppointments: AppointmentRow[];
  students: StudentOption[];
  teacherId: string;
}

export default function AppointmentsBoard({
  initialAppointments,
  students,
  teacherId,
}: Props) {
  const supabase = createClient();

  const [appointments, setAppointments] =
    useState<AppointmentRow[]>(initialAppointments);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Pointer sürükleme algılayıcısı — kart üzerinden 6px hareket gerektirir,
  // böylece sıradan tıklamalar drag olarak yorumlanmaz.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ─── Status -> kart eşlemesi ─────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<AppointmentStatus, AppointmentRow[]> = {
      pending: [],
      confirmed: [],
      completed: [],
      cancelled: [],
    };
    for (const a of appointments) {
      const status = (
        ["pending", "confirmed", "completed", "cancelled"].includes(a.status)
          ? a.status
          : "pending"
      ) as AppointmentStatus;
      map[status].push(a);
    }
    // Her kolonu kendi içinde tarihe göre sırala (yakın → uzak)
    for (const key of Object.keys(map) as AppointmentStatus[]) {
      map[key].sort(
        (a, b) =>
          new Date(a.appointment_date).getTime() -
          new Date(b.appointment_date).getTime()
      );
    }
    return map;
  }, [appointments]);

  const activeAppointment = useMemo(
    () => appointments.find((a) => a.id === activeId) ?? null,
    [appointments, activeId]
  );

  // ─── Drag handlers ───────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(Number(e.active.id));
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const id = Number(active.id);
      const newStatus = String(over.id) as AppointmentStatus;
      const current = appointments.find((a) => a.id === id);
      if (!current) return;
      if (current.status === newStatus) return; // aynı kolona bırakıldı

      // Optimistic UI
      const prevStatus = current.status;
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );

      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        // Rollback
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: prevStatus } : a))
        );
        setToast({
          type: "error",
          message: "Güncellenemedi: " + error.message,
        });
        return;
      }

      const col = COLUMNS.find((c) => c.id === newStatus);
      setToast({
        type: "success",
        message: `Randevu "${col?.label ?? newStatus}" olarak güncellendi.`,
      });
    },
    [appointments, supabase]
  );

  // ─── Yeni randevu eklendiğinde state'e yansıt ─────────────────────────────
  const handleCreated = useCallback((created: AppointmentRow) => {
    setAppointments((prev) => [...prev, created]);
    setToast({ type: "success", message: "Yeni randevu oluşturuldu." });
  }, []);

  // ─── Görsel: kolon bilgi şeridi (kolon başına sayım) ─────────────────────
  const totals = useMemo(
    () => ({
      pending: grouped.pending.length,
      confirmed: grouped.confirmed.length,
      completed: grouped.completed.length,
      cancelled: grouped.cancelled.length,
    }),
    [grouped]
  );

  return (
    <>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Toolbar: özet sayım + yeni randevu butonu */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {COLUMNS.map((c) => (
            <StatusSummaryBadge key={c.id} column={c} count={totals[c.id]} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={students.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--primary)]/40 active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          title={
            students.length === 0
              ? "Önce sana öğrenci atanması gerekiyor"
              : "Yeni randevu oluştur"
          }
        >
          <Plus className="h-4 w-4" />
          Yeni Randevu
        </button>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <AppointmentColumn
              key={col.id}
              column={col}
              appointments={grouped[col.id]}
            />
          ))}
        </div>

        {/* Drag preview */}
        <DragOverlay dropAnimation={{ duration: 180 }}>
          {activeAppointment ? (
            <div
              className="rotate-1 scale-105 cursor-grabbing"
              style={{
                filter: "drop-shadow(0 20px 40px rgba(123,47,255,0.35))",
              }}
            >
              <AppointmentCard
                appointment={activeAppointment}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Yeni Randevu Modal */}
      <NewAppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        students={students}
        teacherId={teacherId}
        onCreated={handleCreated}
        onError={(msg) => setToast({ type: "error", message: msg })}
      />
    </>
  );
}
