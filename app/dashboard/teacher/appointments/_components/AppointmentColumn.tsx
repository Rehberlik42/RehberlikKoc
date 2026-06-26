"use client";

import { useEffect, useRef, useState } from "react";
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
  const seenCardIds = useRef(new Set<number>());
  const prevCount = useRef(appointments.length);
  const [badgePop, setBadgePop] = useState(false);

  useEffect(() => {
    if (prevCount.current !== appointments.length) {
      setBadgePop(true);
      const t = setTimeout(() => setBadgePop(false), 220);
      prevCount.current = appointments.length;
      return () => clearTimeout(t);
    }
  }, [appointments.length]);

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-h-[60vh] flex-col rounded-2xl border p-3 backdrop-blur-md transition-all duration-300 ${
        isOver
          ? `${column.ring} ring-2 ring-offset-0 shadow-lg`
          : "border-[var(--border)] bg-[var(--surface)]/40"
      }`}
      style={
        isOver
          ? {
              background: `linear-gradient(180deg, ${column.glow.replace("0.35", "0.18")} 0%, rgba(15,23,42,0.65) 45%, rgba(15,23,42,0.55) 100%)`,
              boxShadow: `0 0 0 1px ${column.glow}, 0 8px 32px ${column.glow}, inset 0 1px 0 ${column.glow.replace("0.35", "0.12")}`,
            }
          : undefined
      }
    >
      {/* Glow accent (sadece görsel) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-[50px]"
        style={{
          background: column.glow,
          opacity: isOver ? 0.55 : 0.3,
        }}
      />

      {/* Header */}
      <div className="relative mb-3 flex items-center justify-between border-b border-[var(--border)] px-2 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-[var(--surface-2)] transition-all duration-300 ${column.accent} ${column.ring} ${
              isOver ? "scale-110 shadow-lg" : "scale-100"
            }`}
            style={
              isOver
                ? { boxShadow: `0 0 16px ${column.glow}` }
                : undefined
            }
          >
            {column.icon}
          </div>
          <h3 className={`text-sm font-bold ${column.accent}`}>
            {column.label}
          </h3>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums transition-transform duration-200 ${column.badgeBg} ${
            badgePop ? "scale-125" : "scale-100"
          }`}
        >
          {appointments.length}
        </span>
      </div>

      {/* Card stack */}
      <div className="relative flex-1 space-y-2.5 overflow-y-auto pr-0.5">
        {appointments.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-3 py-8 text-center transition-all duration-300 ${
              isOver
                ? `${column.ring} animate-pulse`
                : "border-[var(--border)]"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                isOver ? column.accent : "text-[var(--text-muted)]"
              }`}
            >
              {isOver ? "Buraya bırak…" : "Bu kolonda randevu yok"}
            </p>
          </div>
        ) : (
          appointments.map((appt, index) => {
            const shouldAnimate = !seenCardIds.current.has(appt.id);
            seenCardIds.current.add(appt.id);

            return (
              <div
                key={appt.id}
                className={
                  shouldAnimate
                    ? "animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300"
                    : undefined
                }
                style={
                  shouldAnimate
                    ? { animationDelay: `${Math.min(index * 40, 280)}ms` }
                    : undefined
                }
              >
                <AppointmentCard appointment={appt} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
