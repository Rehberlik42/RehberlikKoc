import { Search } from "lucide-react";
import RouteLoadingIcon from "@/app/dashboard/_components/RouteLoadingIcon";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <RouteLoadingIcon
        icon={Search}
        animation="sweep"
        label="Denemeler taranıyor..."
      />
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-72 max-w-full rounded-lg bg-[var(--surface-2)]" />
            <div className="h-4 w-80 max-w-full rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-[var(--surface-2)]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-[var(--surface-2)]" />
          <div className="h-28 rounded-2xl bg-[var(--surface-2)]" />
          <div className="h-28 rounded-2xl bg-[var(--surface-2)]" />
        </div>

        <div className="h-72 rounded-2xl bg-[var(--surface-2)]" />
        <div className="h-40 rounded-2xl bg-[var(--surface-2)]" />
        <div className="h-56 max-w-xl rounded-2xl bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}
