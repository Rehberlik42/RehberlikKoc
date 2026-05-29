"use client";

import { useDroppable } from "@dnd-kit/core";
import type { AppointmentRow } from "../page";
import type { ColumnDef } from "./AppointmentsBoard";
import AppointmentCard from "./AppointmentCard";

interface Props {
  column: ColumnDef;
  appointments: AppointmentRow[];
}

export default function AppointmentColumn({ column, appointments }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded-2xl border bg-slate-900/40 backdrop-blur-md p-3 flex flex-col min-h-[60vh] transition-all duration-200 ${
        isOver
          ? `${column.ring} bg-slate-900/60 ring-2 ring-offset-0 shadow-lg`
          : "border-white/8"
      }`}
      style={
        isOver
          ? {
              boxShadow: `0 0 0 1px ${column.glow}, 0 8px 32px ${column.glow}`,
            }
          : undefined
      }
    >
      {/* Glow accent (sadece görsel) */}
      <div
        aria-hidden
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-[50px] pointer-events-none opacity-30"
        style={{ background: column.glow }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-2 pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg border bg-white/4 flex items-center justify-center ${column.accent} ${column.ring}`}
          >
            {column.icon}
          </div>
          <h3 className={`text-sm font-bold ${column.accent}`}>
            {column.label}
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${column.badgeBg} border`}
        >
          {appointments.length}
        </span>
      </div>

      {/* Card stack */}
      <div className="relative flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/8 px-3 py-8 text-center">
            <p className="text-white/30 text-xs">
              {isOver ? "Buraya bırak…" : "Bu kolonda randevu yok"}
            </p>
          </div>
        ) : (
          appointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} />
          ))
        )}
      </div>
    </div>
  );
}
