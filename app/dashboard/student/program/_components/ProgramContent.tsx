"use client";

import { useState } from "react";
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
      <div className="pdf-export-hide print-hidden">
        <StudentWeeklyPlan />
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
