/** PDF yakalama bolgesinde gorunen marka basligi (ekranda da okunakli) */

export default function PdfReportHeader({
  subtitle,
  eyebrow = "MINDORA Raporu",
}: {
  subtitle: string;
  eyebrow?: string;
}) {
  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-black text-[var(--text-primary)] sm:text-xl">
        {subtitle}
      </h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{dateLabel}</p>
    </div>
  );
}
