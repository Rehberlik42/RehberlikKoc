"use client";

import { useEffect, useState } from "react";

function useAnimatedNumber(target: number, active: boolean, duration = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active, duration]);

  return value;
}

const ACCENT_GLOW: Record<string, string> = {
  "text-[#A78BFF]": "group-hover:shadow-[0_0_14px_rgba(167,139,255,0.35)]",
  "text-[#7AB3FF]": "group-hover:shadow-[0_0_14px_rgba(122,179,255,0.35)]",
  "text-[#70E6FF]": "group-hover:shadow-[0_0_14px_rgba(112,230,255,0.35)]",
};

export default function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
}) {
  const isNumber = typeof value === "number";
  const animated = useAnimatedNumber(isNumber ? value : 0, isNumber);
  const glowClass = ACCENT_GLOW[accent] ?? "group-hover:shadow-[0_0_14px_rgba(123,47,255,0.25)]";

  return (
    <div className="group rounded-2xl border border-white/8 bg-slate-900/50 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/12 hover:shadow-lg hover:shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
          {label}
        </p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition-shadow duration-300 ${accent} ${glowClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums text-white">
        {isNumber ? Math.round(animated) : value}
      </p>
    </div>
  );
}
