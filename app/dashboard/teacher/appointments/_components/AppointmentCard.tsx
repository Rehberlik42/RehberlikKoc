"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Calendar,
  Clock,
  GripVertical,
  StickyNote,
} from "lucide-react";
import type { AppointmentRow } from "../page";
import { initialsFromName } from "@/lib/student-helpers";
import { COLUMNS, type AppointmentStatus } from "./AppointmentsBoard";

interface Props {
  appointment: AppointmentRow;
  /** DragOverlay içinde render edildiğinde transform/listener gerekmez. */
  isDragOverlay?: boolean;
}

function statusColumn(status: AppointmentRow["status"]) {
  const id = (
    ["pending", "confirmed", "completed", "cancelled"].includes(status)
      ? status
      : "pending"
  ) as AppointmentStatus;
  return COLUMNS.find((c) => c.id === id) ?? COLUMNS[0];
}

export default function AppointmentCard({ appointment, isDragOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: appointment.id,
      disabled: isDragOverlay,
    });

  const statusCol = statusColumn(appointment.status);

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
      };

  const date = new Date(appointment.appointment_date);
  const dateLabel = date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
  const timeLabel = date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPast = date.getTime() < Date.now();
  const showPastWarning =
    isPast &&
    (appointment.status === "pending" || appointment.status === "confirmed");

  const avatarUrl = appointment.student?.avatar_url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-xl border border-white/8 bg-[#0d0d2b]/80 p-3 backdrop-blur-sm transition-all duration-200 ${
        isDragOverlay
          ? "border-[#7B2FFF]/40 shadow-2xl shadow-[#7B2FFF]/30"
          : "hover:-translate-y-0.5 hover:border-[#7B2FFF]/30 hover:bg-[#0d0d2b] hover:shadow-md hover:shadow-[#7B2FFF]/10"
      }`}
    >
      {/* Durum aksan şeridi */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl"
        style={{ background: statusCol.glow.replace("0.35", "0.85") }}
      />

      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className={`absolute right-2 top-2 text-white/20 transition-colors group-hover:text-white/50 ${
          isDragOverlay ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Öğrenci başlığı */}
      <div className="flex items-center gap-2.5 pl-1 pr-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover shadow-sm shadow-[#7B2FFF]/20"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] text-[11px] font-black text-white shadow-sm shadow-[#7B2FFF]/20">
            {initialsFromName(appointment.student?.full_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-white">
            {appointment.student?.full_name ?? "İsimsiz Öğrenci"}
          </p>
          {appointment.student?.grade && (
            <p className="mt-0.5 text-[10px] text-white/30">
              {appointment.student.grade}. sınıf
            </p>
          )}
        </div>
      </div>

      {/* Tarih + süre */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          {dateLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {timeLabel}
          <span className="text-white/30">
            · {appointment.duration_minutes}dk
          </span>
        </span>
      </div>

      {/* Notlar */}
      {appointment.notes && (
        <div className="mt-2.5 flex items-start gap-1.5 border-t border-white/5 pt-2.5 pl-1">
          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
          <p className="line-clamp-2 text-[11px] leading-relaxed text-white/60">
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Geçmiş tarih uyarısı */}
      {showPastWarning && (
        <div className="mt-2.5 pl-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Tarih geçmiş
          </span>
        </div>
      )}
    </div>
  );
}
