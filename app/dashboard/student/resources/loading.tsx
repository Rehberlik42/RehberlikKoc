import { Library } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
      <RouteLoadingIcon
        icon={Library}
        animation="riffle"
        label="Kaynaklar yükleniyor..."
      />
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-64 max-w-full rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-10 w-32 rounded-xl bg-[var(--surface-2)]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-[var(--border)]"
            >
              <div className="h-28 bg-[var(--surface-2)]" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-28 rounded bg-[var(--surface-2)]" />
                <div className="h-3 w-full rounded bg-[var(--surface-2)]" />
                <div className="h-2 w-full rounded-full bg-[var(--surface-2)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
