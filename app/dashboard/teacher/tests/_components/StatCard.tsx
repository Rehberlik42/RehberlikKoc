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

export default function StatCard({
  icon,
  label,
  value,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  glow: string;
}) {
  const isNumber = typeof value === "number";
  const animated = useAnimatedNumber(isNumber ? value : 0, isNumber);
  const displayValue = isNumber ? Math.round(animated) : value;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 backdrop-blur-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-[50px]"
        style={{ background: glow }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {label}
          </p>
          <p className="text-3xl font-black tabular-nums text-[var(--text-primary)]">
            {displayValue}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]">
          {icon}
        </div>
      </div>
    </div>
  );
}
