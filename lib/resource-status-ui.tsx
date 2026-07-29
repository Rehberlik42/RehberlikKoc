import { Check, X } from "lucide-react";

/**
 * Konu×kaynak ilerlemesinin (study_resource_topic_progress.status) görsel katmanı.
 * Kaynak matrisleri ve kaynak detay modalleri buradan besleniyor; renkler hem
 * "night" hem krem/vanilya temalarında okunacak tonlardan seçildi.
 */
export const RESOURCE_STATUS_VALUES = [
  "calisilmadi",
  "baslandi",
  "devam_ediyor",
  "tamamlandi",
  "tekrar_gerekli",
] as const;

export type ResourceStatus = (typeof RESOURCE_STATUS_VALUES)[number];

export function normalizeStatus(
  value: string | null | undefined
): ResourceStatus {
  return value && (RESOURCE_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as ResourceStatus)
    : "calisilmadi";
}

export function statusChipClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "tamamlandi":
      return "border-emerald-600 bg-emerald-600 text-white";
    case "baslandi":
    case "devam_ediyor":
      return "border-amber-500/60 bg-amber-500/15 text-amber-600";
    case "tekrar_gerekli":
      return "border-rose-600 bg-rose-600 text-white";
    default:
      // İkon yok (boş halka); renk yalnızca kayıt sırasındaki spinner'a uygulanır
      return "border-[var(--border)] bg-transparent text-[var(--text-muted)]";
  }
}

/** %50 dolu halka — "devam ediyor"; ilerleme donut'ıyla aynı stroke-dasharray deseni */
export function HalfRing({ className = "h-3.5 w-3.5" }: { className?: string }) {
  const r = 7;
  const circ = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.25"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={circ / 2}
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}

export function StatusIcon({
  status,
  className = "h-3.5 w-3.5",
}: {
  status: string;
  className?: string;
}) {
  switch (normalizeStatus(status)) {
    case "tamamlandi":
      return <Check className={className} strokeWidth={3} aria-hidden />;
    case "baslandi":
    case "devam_ediyor":
      return <HalfRing className={className} />;
    case "tekrar_gerekli":
      return <X className={className} strokeWidth={3} aria-hidden />;
    default:
      return null;
  }
}

export function StatusChip({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full border ${statusChipClass(status)}`}
    >
      <StatusIcon status={status} className={icon} />
    </span>
  );
}
