import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { WeeklyStudentSummary } from "./mistake-analysis-utils";

interface Props {
  summaries: WeeklyStudentSummary[];
}

function DegisimCell({ degisim }: { degisim: number }) {
  if (degisim === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
        <ArrowRight className="h-3.5 w-3.5" />
        değişim yok
      </span>
    );
  }
  if (degisim > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
        <ArrowUp className="h-3.5 w-3.5" />
        +{degisim}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-300">
      <ArrowDown className="h-3.5 w-3.5" />
      {degisim}
    </span>
  );
}

export default function WeeklyStudentSummaryTable({ summaries }: Props) {
  const sorted = [...summaries].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "tr")
  );

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          Haftalık öğrenci özeti
        </h3>
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          Pazartesi başlangıçlı bu hafta vs geçen hafta — kayıt ve tekrar
          performansı
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <th className="px-3 py-2.5 font-bold">Öğrenci</th>
              <th className="px-3 py-2.5 font-bold">Bu hafta kayıt</th>
              <th className="px-3 py-2.5 font-bold">Geçen haftaya göre</th>
              <th className="px-3 py-2.5 font-bold">Sarı / Kırmızı</th>
              <th className="px-3 py-2.5 font-bold">Tekrar başarı</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.studentId}
                className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-2)]/40"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/dashboard/teacher/students/${row.studentId}`}
                    className="font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
                  >
                    {row.studentName}
                  </Link>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[var(--text-primary)]">
                  {row.buHaftaKayit}
                </td>
                <td className="px-3 py-2.5">
                  <DegisimCell degisim={row.degisim} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200 ring-1 ring-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {row.buHaftaSari}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-200 ring-1 ring-rose-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {row.buHaftaKirmizi}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">
                  {row.tekrarBasariOrani == null
                    ? "veri yok"
                    : `%${Math.round(row.tekrarBasariOrani * 100)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
