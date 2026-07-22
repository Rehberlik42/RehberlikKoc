import { GraduationCap } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <RouteLoadingIcon
        icon={GraduationCap}
        animation="pulse"
        label="Öğrenci profili yükleniyor..."
      />
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-[var(--surface-2)]" />
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-5">
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-[var(--surface-2)]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-24 rounded-full bg-[var(--surface-2)]" />
              <div className="h-8 w-56 max-w-full rounded-lg bg-[var(--surface-2)]" />
              <div className="h-4 w-40 rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        </div>
        <div className="h-14 rounded-2xl bg-[var(--surface-2)]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
          <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
          <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
        </div>
        <div className="h-64 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-40 rounded-xl bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
