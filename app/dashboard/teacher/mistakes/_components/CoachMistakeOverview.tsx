import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import {
  MISTAKE_THRESHOLDS,
  type StudentMistakeSignal,
  type SubjectLearningRate,
} from "./mistake-analysis-utils";

interface Props {
  signals: StudentMistakeSignal[];
  subjectRates: SubjectLearningRate[];
}

function CategoryCard({
  title,
  icon,
  hint,
  children,
  empty,
}: {
  title: string;
  icon: ReactNode;
  hint?: string;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 text-[var(--accent)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>
          {hint && (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{hint}</p>
          )}
        </div>
      </div>
      {empty ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-emerald-500/25 bg-emerald-500/5 px-3 py-4 text-sm text-emerald-200/90">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          Bu kategoriye giren kimse yok — sorun görünmüyor.
        </div>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function StudentLink({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <Link
      href={`/dashboard/teacher/students/${id}`}
      className="font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
    >
      {name}
    </Link>
  );
}

function StudentRow({
  children,
  badge,
}: {
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/80 px-3.5 py-3">
      <div className="min-w-0 text-sm text-[var(--text-secondary)]">
        {children}
      </div>
      {badge}
    </li>
  );
}

export default function CoachMistakeOverview({
  signals,
  subjectRates,
}: Props) {
  const T = MISTAKE_THRESHOLDS;

  const aksatanlar = signals
    .filter((s) => s.flags.aksatan)
    .sort((a, b) => b.gecikmisSayisi - a.gecikmisSayisi);

  const cokKirmizi = signals
    .filter((s) => s.flags.cokKirmizi)
    .sort((a, b) => b.aktifKirmizi - a.aktifKirmizi);

  const tekrarEden = signals
    .filter((s) => s.flags.tekrarEdenKonu)
    .sort(
      (a, b) =>
        (b.tekrarEdenKonular[0]?.count ?? 0) -
        (a.tekrarEdenKonular[0]?.count ?? 0)
    );

  const sikDonusum = signals
    .filter((s) => s.flags.sikDonusum)
    .sort((a, b) => b.donusumSayisi - a.donusumSayisi);

  const duzensiz = signals
    .filter((s) => s.flags.duzensiz)
    .sort(
      (a, b) =>
        (b.gunSayisiSonKayittan ?? 9999) - (a.gunSayisiSonKayittan ?? 9999)
    );

  const dusukDersler = subjectRates
    .filter(
      (r) => r.oran != null && r.oran < T.dusukOgrenmeOraniEsik
    )
    .sort((a, b) => (a.oran ?? 1) - (b.oran ?? 1));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CategoryCard
        title="Tekrarlarını Aksatanlar"
        icon={<Clock className="h-4.5 w-4.5" />}
        hint={`Gecikmiş soru > ${T.gecikmisAksatanEsik}`}
        empty={aksatanlar.length === 0}
      >
        {aksatanlar.map((s) => (
          <StudentRow
            key={s.studentId}
            badge={
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-200">
                {s.gecikmisSayisi} gecikmiş
              </span>
            }
          >
            <StudentLink id={s.studentId} name={s.studentName} />
          </StudentRow>
        ))}
      </CategoryCard>

      <CategoryCard
        title="Çok Kırmızı Biriktirenler"
        icon={<Flame className="h-4.5 w-4.5" />}
        hint={`Aktif bilgi eksiği ≥ ${T.cokKirmiziEsik}`}
        empty={cokKirmizi.length === 0}
      >
        {cokKirmizi.map((s) => (
          <StudentRow
            key={s.studentId}
            badge={
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-rose-200">
                {s.aktifKirmizi} kırmızı
              </span>
            }
          >
            <StudentLink id={s.studentId} name={s.studentName} />
            <span className="text-[var(--text-muted)]">
              {" "}
              · {s.aktifSari} sarı
            </span>
          </StudentRow>
        ))}
      </CategoryCard>

      <CategoryCard
        title="Aynı Konuda Tekrar Hata Yapanlar"
        icon={<RefreshCw className="h-4.5 w-4.5" />}
        hint={`Aynı konuda ≥ ${T.tekrarEdenKonuEsik} kayıt`}
        empty={tekrarEden.length === 0}
      >
        {tekrarEden.map((s) => (
          <StudentRow key={s.studentId}>
            <StudentLink id={s.studentId} name={s.studentName} />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {s.tekrarEdenKonular
                .map((t) => `${t.topicName} (${t.count}×)`)
                .join(" · ")}
            </p>
          </StudentRow>
        ))}
      </CategoryCard>

      <CategoryCard
        title="Dikkatsizlik Dediği Hâlde Tekrar Yanlış Yapanlar"
        icon={<AlertTriangle className="h-4.5 w-4.5" />}
        hint={`Dikkatsizlik → bilgi eksiği dönüşümü ≥ ${T.donusumSikEsik}`}
        empty={sikDonusum.length === 0}
      >
        {sikDonusum.map((s) => (
          <StudentRow
            key={s.studentId}
            badge={
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-orange-200">
                {s.donusumSayisi} dönüşüm
              </span>
            }
          >
            <StudentLink id={s.studentId} name={s.studentName} />
          </StudentRow>
        ))}
      </CategoryCard>

      <CategoryCard
        title="Düzenli Soru Girmeyenler"
        icon={<BookOpen className="h-4.5 w-4.5" />}
        hint={`Son kayıttan ≥ ${T.duzensizGunEsik} gün`}
        empty={duzensiz.length === 0}
      >
        {duzensiz.map((s) => (
          <StudentRow
            key={s.studentId}
            badge={
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                {s.gunSayisiSonKayittan == null
                  ? "Hiç kayıt yok"
                  : `${s.gunSayisiSonKayittan} gün`}
              </span>
            }
          >
            <StudentLink id={s.studentId} name={s.studentName} />
          </StudentRow>
        ))}
      </CategoryCard>

      <CategoryCard
        title="Kalıcı Öğrenme Oranı Düşük Dersler"
        icon={<TrendingDown className="h-4.5 w-4.5" />}
        hint={`Bilgi eksiği tamamlanma oranı < %${Math.round(T.dusukOgrenmeOraniEsik * 100)}`}
        empty={dusukDersler.length === 0}
      >
        {dusukDersler.map((r) => (
          <StudentRow
            key={r.subjectId}
            badge={
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-rose-200">
                %{Math.round((r.oran ?? 0) * 100)}
              </span>
            }
          >
            <span className="font-semibold text-[var(--text-primary)]">
              {r.subjectName}
            </span>
            <span className="text-[var(--text-muted)]">
              {" "}
              · {r.tamamlananBilgiEksigi}/{r.toplamBilgiEksigi} tamamlandı
            </span>
          </StudentRow>
        ))}
      </CategoryCard>
    </div>
  );
}
