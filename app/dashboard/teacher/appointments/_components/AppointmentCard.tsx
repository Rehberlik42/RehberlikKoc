"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Clock, GripVertical, StickyNote } from "lucide-react";
import type { AppointmentRow } from "../page";
import { initialsFromName } from "@/lib/student-helpers";

interface Props {
  appointment: AppointmentRow;
  /** DragOverlay içinde render edildiğinde transform/listener gerekmez. */
  isDragOverlay?: boolean;
}

export default function AppointmentCard({ appointment, isDragOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: appointment.id,
      disabled: isDragOverlay,
    });

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1, // gerçek kart drag esnasında gizlenir, overlay görünür
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-white/8 bg-[#0d0d2b]/80 backdrop-blur-sm p-3 transition-all duration-200 ${
        isDragOverlay
          ? "shadow-2xl shadow-[#7B2FFF]/30 border-[#7B2FFF]/40"
          : "hover:border-[#7B2FFF]/30 hover:bg-[#0d0d2b] hover:shadow-md hover:shadow-[#7B2FFF]/10"
      }`}
    >
      {/* Drag handle (kartın tamamı drag'i tetikler, bu sadece görsel ipucu) */}
      <div
        {...listeners}
        {...attributes}
        className={`absolute top-2 right-2 text-white/20 group-hover:text-white/50 transition-colors ${
          isDragOverlay ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Öğrenci başlığı */}
      <div className="flex items-center gap-2.5 pr-5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B2FFF] to-[#4F7CFF] flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-sm shadow-[#7B2FFF]/20">
          {initialsFromName(appointment.student?.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">
            {appointment.student?.full_name ?? "İsimsiz Öğrenci"}
          </p>
          {appointment.student?.grade && (
            <p className="text-white/30 text-[10px] mt-0.5">
              {appointment.student.grade}. sınıf
            </p>
          )}
        </div>
      </div>

      {/* Tarih + süre */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {dateLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeLabel}
          <span className="text-white/30">· {appointment.duration_minutes}dk</span>
        </span>
      </div>

      {/* Notlar (eğer varsa) */}
      {appointment.notes && (
        <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-start gap-1.5">
          <StickyNote className="w-3 h-3 text-white/30 shrink-0 mt-0.5" />
          <p className="text-white/60 text-[11px] leading-relaxed line-clamp-2">
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Geçmiş tarih uyarısı */}
      {isPast &&
        (appointment.status === "pending" ||
          appointment.status === "confirmed") && (
          <p className="mt-2 text-[10px] text-amber-400/80 font-semibold">
            ⚠ Tarih geçmiş — durumu güncellemek isteyebilirsin.
          </p>
        )}
    </div>
  );
}
