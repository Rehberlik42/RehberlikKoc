"use client";

import { useState } from "react";

type TabId = "overview" | "program" | "analysis";

interface Props {
  overview: React.ReactNode;
  program: React.ReactNode;
  analysis: React.ReactNode;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Genel Bakış" },
  { id: "program", label: "Haftalık Program" },
  { id: "analysis", label: "Deneme Analizi" },
];

export default function StudentDetailTabs({ overview, program, analysis }: Props) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Öğrenci detay sekmeleri"
        className="flex gap-1 rounded-2xl border border-white/8 bg-[#0d0d2b]/60 p-1"
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
                  ? "bg-[#7B2FFF]/15 text-white shadow-[0_0_20px_rgba(123,47,255,0.15)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF]" />
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
            : analysis}
      </div>
    </div>
  );
}
