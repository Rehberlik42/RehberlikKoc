import type { LucideIcon } from "lucide-react";

const ANIMATION_CLASS = {
  sweep: "animate-sweep-search",
  flip: "animate-flip-page",
  riffle: "animate-riffle",
  spin: "animate-slow-spin",
  pulse: "animate-pulse",
} as const;

export default function RouteLoadingIcon({
  icon: Icon,
  animation,
  label,
}: {
  icon: LucideIcon;
  animation: keyof typeof ANIMATION_CLASS;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <Icon
        className={`h-8 w-8 text-[var(--primary)] ${ANIMATION_CLASS[animation]}`}
        strokeWidth={1.75}
      />
      {label ? (
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
      ) : null}
    </div>
  );
}
