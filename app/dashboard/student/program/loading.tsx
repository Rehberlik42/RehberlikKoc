import { CalendarDays } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6">
      <RouteLoadingIcon
        icon={CalendarDays}
        animation="flip"
        label="Program hazırlanıyor..."
      />
      <div className="space-y-7 animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-5 w-28 rounded-full bg-[var(--surface-2)]" />
            <div className="h-8 w-56 max-w-full rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-72 max-w-full rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-[var(--surface-2)]" />
        </div>

        <div className="overflow-x-auto">
          <div className="grid w-max min-w-full grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-64 min-w-[240px] rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-48 rounded-xl bg-[var(--surface-2)] lg:col-span-2" />
          <div className="h-48 rounded-xl bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}
