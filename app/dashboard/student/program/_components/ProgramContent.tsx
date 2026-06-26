"use client";

import { useState } from "react";
import { BookOpenCheck, ListTodo } from "lucide-react";
import PdfReportHeader from "@/app/dashboard/_components/PdfReportHeader";
import { PDF_EXPORT_BG } from "@/lib/pdf-export-constants";
import SessionEntryForm, { type Subject } from "./SessionEntryForm";
import SessionsList from "./SessionsList";
import WeeklySummary from "./WeeklySummary";
import StudentWeeklyPlan from "./StudentWeeklyPlan";

export default function ProgramContent({ subjects }: { subjects: Subject[] }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Bölüm 1 — Görevlerim */}
      <div className="pdf-export-hide print-hidden space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/25 to-[var(--primary-2)]/15">
            <ListTodo className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Görevlerim</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Öğretmeninin senin için planladığı görevler. Tamamladıkça işaretle.
            </p>
          </div>
        </div>
        <StudentWeeklyPlan />
      </div>

      {/* Görsel ayraç */}
      <div className="pdf-export-hide print-hidden flex items-center gap-4 py-1">
        <div className="flex-1 border-t border-[var(--border)]" />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          ·
        </span>
        <div className="flex-1 border-t border-[var(--border)]" />
      </div>

      {/* Bölüm 2 — Çalışma Kaydım başlığı */}
      <div className="pdf-export-hide print-hidden">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary-2)]/20 bg-gradient-to-br from-[var(--primary-2)]/25 to-[var(--primary-3)]/15">
            <BookOpenCheck className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Çalışma Kaydım</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Bugün kaç soru çözdüğünü, kaç net yaptığını ve ne kadar çalıştığını kaydet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Sol: Form — PDF disinda */}
        <div className="xl:sticky xl:top-4 pdf-export-hide print-hidden">
          <SessionEntryForm
            subjects={subjects}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        {/* Sag: PDF alani + liste */}
        <div className="space-y-4 min-w-0">
          <div
            id="program-export-root"
            className="space-y-4 rounded-2xl p-4 sm:p-5"
            style={{ backgroundColor: PDF_EXPORT_BG }}
          >
            <PdfReportHeader subtitle="Haftalık Çalışma Programı" />
            <WeeklySummary refreshKey={refreshKey} />
            <SessionsList refreshKey={refreshKey} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
