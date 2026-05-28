"use client";

import { useState } from "react";
import SessionEntryForm, { type Subject } from "./SessionEntryForm";
import SessionsList from "./SessionsList";

export default function ProgramContent({ subjects }: { subjects: Subject[] }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
      {/* Sol: Form */}
      <div className="xl:sticky xl:top-4">
        <SessionEntryForm
          subjects={subjects}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      {/* Sağ: Liste */}
      <SessionsList refreshKey={refreshKey} />
    </div>
  );
}
