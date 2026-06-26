/** PDF yakalama bolgesinde gorunen marka basligi (ekranda da okunakli) */

import { PDF_EXPORT_BG } from "@/lib/pdf-export-constants";

export default function PdfReportHeader({
  subtitle,
}: {
  subtitle: string;
}) {
  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="rounded-xl border border-[var(--border)] px-5 py-4 mb-4"
      style={{ backgroundColor: PDF_EXPORT_BG }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
        MINDORA Raporu
      </p>
      <h3 className="text-[var(--text-primary)] text-lg sm:text-xl font-black mt-1">{subtitle}</h3>
      <p className="text-[var(--text-muted)] text-xs mt-1">{dateLabel}</p>
    </div>
  );
}
