"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

export default function SummaryCard({
  icon,
  label,
  value,
  sub,
  href,
  ctaLabel,
  glow,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  href: string;
  ctaLabel: string;
  glow: string;
  accent: string;
}) {
  const isNumber = typeof value === "number";
  const animated = useAnimatedNumber(isNumber ? value : 0, isNumber);
  const displayValue = isNumber ? Math.round(animated) : value;

  return (
    <Link
      href={href}
      className="group relative block animate-in fade-in fill-mode-both overflow-hidden rounded-2xl border border-white/8 bg-slate-900/50 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-60 blur-[50px] transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className="text-3xl font-black tabular-nums text-white">
            {displayValue}
          </p>
          <p className="mt-1 text-xs text-white/30">{sub}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] ${accent}`}
        >
          {icon}
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/5 pt-4 text-xs">
        <span className="font-medium text-white/40">{ctaLabel}</span>
        <ArrowRight
          className={`h-3.5 w-3.5 ${accent} transition-transform group-hover:translate-x-0.5`}
        />
      </div>
    </Link>
  );
}
