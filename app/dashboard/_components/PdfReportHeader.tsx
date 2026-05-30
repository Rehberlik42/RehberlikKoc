/** PDF yakalama bolgesinde gorunen marka basligi (ekranda da okunakli) */

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
    <div className="rounded-xl border border-white/10 bg-[#0f172a] px-5 py-4 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A78BFF]">
        MINDORA Raporu
      </p>
      <h3 className="text-white text-lg sm:text-xl font-black mt-1">{subtitle}</h3>
      <p className="text-white/40 text-xs mt-1">{dateLabel}</p>
    </div>
  );
}
