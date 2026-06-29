"use client";

import { useState } from "react";

type TabId = "overview" | "program" | "analysis" | "targets";

interface Props {
  overview: React.ReactNode;
  program: React.ReactNode;
  analysis: React.ReactNode;
  targets?: React.ReactNode;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Genel Bakış" },
  { id: "program", label: "Haftalık Program" },
  { id: "analysis", label: "Deneme Analizi" },
  { id: "targets", label: "Hedefler" },
];

export default function StudentDetailTabs({
  overview,
  program,
  analysis,
  targets,
}: Props) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Öğrenci detay sekmeleri"
        className="flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-1"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={`relative flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-[var(--primary)]/15 text-[var(--text-primary)] shadow-[0_0_20px_rgba(123,47,255,0.15)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)]" />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        key={active}
        className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
      >
        {active === "overview"
          ? overview
          : active === "program"
            ? program
            : active === "analysis"
              ? analysis
              : targets}
      </div>
    </div>
  );
}
