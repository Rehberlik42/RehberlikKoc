export const MISTAKE_THRESHOLDS = {
  gecikmisAksatanEsik: 3,
  cokKirmiziEsik: 10,
  tekrarEdenKonuEsik: 2,
  donusumSikEsik: 2,
  duzensizGunEsik: 7,
  dusukOgrenmeOraniEsik: 0.5,
} as const;

export interface RawMistakeEntry {
  id: number;
  student_id: string;
  subject_id: number;
  topic_id: number | null;
  cause_type: "dikkatsizlik" | "bilgi_eksigi";
  status: "aktif" | "tamamlandi";
  converted_from_dikkatsizlik: boolean;
  next_review_date: string | null;
  created_at: string;
  subject: { name: string } | { name: string }[] | null;
  topic: { name: string } | { name: string }[] | null;
}

export interface StudentMistakeSignal {
  studentId: string;
  studentName: string;
  gecikmisSayisi: number;
  aktifKirmizi: number;
  aktifSari: number;
  tekrarEdenKonular: { topicName: string; count: number }[];
  donusumSayisi: number;
  sonKayitTarihi: string | null;
  gunSayisiSonKayittan: number | null;
  flags: {
    aksatan: boolean;
    cokKirmizi: boolean;
    tekrarEdenKonu: boolean;
    sikDonusum: boolean;
    duzensiz: boolean;
  };
}

export interface SubjectLearningRate {
  subjectId: number;
  subjectName: string;
  toplamBilgiEksigi: number;
  tamamlananBilgiEksigi: number;
  oran: number | null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function oneName(
  raw: { name: string } | { name: string }[] | null | undefined
): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v?.name ?? null;
}

function daysSince(iso: string, today: Date): number {
  const from = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const to = new Date(`${toISODate(today)}T12:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeStudentMistakeSignals(
  entries: RawMistakeEntry[],
  students: { id: string; full_name: string }[],
  today: Date
): StudentMistakeSignal[] {
  const todayStr = toISODate(today);
  const T = MISTAKE_THRESHOLDS;

  return students.map((student) => {
    const mine = entries.filter((e) => e.student_id === student.id);

    let gecikmisSayisi = 0;
    let aktifKirmizi = 0;
    let aktifSari = 0;
    let donusumSayisi = 0;
    let sonKayitTarihi: string | null = null;

    const topicCounts = new Map<number, { topicName: string; count: number }>();

    for (const e of mine) {
      if (
        e.status === "aktif" &&
        e.next_review_date != null &&
        e.next_review_date < todayStr
      ) {
        gecikmisSayisi += 1;
      }
      if (e.status === "aktif" && e.cause_type === "bilgi_eksigi") {
        aktifKirmizi += 1;
      }
      if (e.status === "aktif" && e.cause_type === "dikkatsizlik") {
        aktifSari += 1;
      }
      if (e.converted_from_dikkatsizlik === true) {
        donusumSayisi += 1;
      }
      if (
        sonKayitTarihi == null ||
        e.created_at > sonKayitTarihi
      ) {
        sonKayitTarihi = e.created_at;
      }

      if (e.topic_id != null) {
        const name = oneName(e.topic) ?? `Konu #${e.topic_id}`;
        const cur = topicCounts.get(e.topic_id);
        if (cur) {
          cur.count += 1;
        } else {
          topicCounts.set(e.topic_id, { topicName: name, count: 1 });
        }
      }
    }

    const tekrarEdenKonular = Array.from(topicCounts.values())
      .filter((t) => t.count >= T.tekrarEdenKonuEsik)
      .sort((a, b) => b.count - a.count);

    const gunSayisiSonKayittan =
      sonKayitTarihi == null ? null : daysSince(sonKayitTarihi, today);

    const flags = {
      aksatan: gecikmisSayisi > T.gecikmisAksatanEsik,
      cokKirmizi: aktifKirmizi >= T.cokKirmiziEsik,
      tekrarEdenKonu: tekrarEdenKonular.length > 0,
      sikDonusum: donusumSayisi >= T.donusumSikEsik,
      duzensiz:
        gunSayisiSonKayittan == null ||
        gunSayisiSonKayittan >= T.duzensizGunEsik,
    };

    return {
      studentId: student.id,
      studentName: student.full_name?.trim() || "İsimsiz öğrenci",
      gecikmisSayisi,
      aktifKirmizi,
      aktifSari,
      tekrarEdenKonular,
      donusumSayisi,
      sonKayitTarihi,
      gunSayisiSonKayittan,
      flags,
    };
  });
}

export function computeSubjectLearningRates(
  entries: RawMistakeEntry[]
): SubjectLearningRate[] {
  const bySubject = new Map<
    number,
    { subjectName: string; toplam: number; tamamlanan: number }
  >();

  for (const e of entries) {
    if (e.cause_type !== "bilgi_eksigi") continue;

    const name = oneName(e.subject) ?? `Ders #${e.subject_id}`;
    const cur = bySubject.get(e.subject_id) ?? {
      subjectName: name,
      toplam: 0,
      tamamlanan: 0,
    };
    cur.toplam += 1;
    if (e.status === "tamamlandi") cur.tamamlanan += 1;
    bySubject.set(e.subject_id, cur);
  }

  return Array.from(bySubject.entries()).map(([subjectId, v]) => ({
    subjectId,
    subjectName: v.subjectName,
    toplamBilgiEksigi: v.toplam,
    tamamlananBilgiEksigi: v.tamamlanan,
    oran: v.toplam === 0 ? null : v.tamamlanan / v.toplam,
  }));
}

export interface RawMistakeReview {
  id: number;
  mistake_entry_id: number;
  result: "dogru" | "yanlis" | null;
  reviewed_at: string | null;
}

export interface WeeklyStudentSummary {
  studentId: string;
  studentName: string;
  buHaftaKayit: number;
  gecenHaftaKayit: number;
  degisim: number;
  buHaftaSari: number;
  buHaftaKirmizi: number;
  buHaftaTekrarSayisi: number;
  buHaftaTekrarDogruSayisi: number;
  tekrarBasariOrani: number | null;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function inHalfOpenRange(
  iso: string,
  start: Date,
  endExclusive: Date
): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < endExclusive.getTime();
}

export function computeWeeklyStudentSummaries(
  entries: RawMistakeEntry[],
  reviews: RawMistakeReview[],
  students: { id: string; full_name: string }[],
  today: Date
): WeeklyStudentSummary[] {
  const thisWeekStart = startOfWeek(today);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const lastWeekStart = addDays(thisWeekStart, -7);

  const entryOwner = new Map<number, string>();
  for (const e of entries) {
    entryOwner.set(e.id, e.student_id);
  }

  return students.map((student) => {
    const mine = entries.filter((e) => e.student_id === student.id);

    let buHaftaKayit = 0;
    let gecenHaftaKayit = 0;
    let buHaftaSari = 0;
    let buHaftaKirmizi = 0;

    for (const e of mine) {
      if (inHalfOpenRange(e.created_at, thisWeekStart, nextWeekStart)) {
        buHaftaKayit += 1;
        if (e.cause_type === "dikkatsizlik") buHaftaSari += 1;
        if (e.cause_type === "bilgi_eksigi") buHaftaKirmizi += 1;
      }
      if (inHalfOpenRange(e.created_at, lastWeekStart, thisWeekStart)) {
        gecenHaftaKayit += 1;
      }
    }

    let buHaftaTekrarSayisi = 0;
    let buHaftaTekrarDogruSayisi = 0;

    for (const r of reviews) {
      if (r.result == null || r.reviewed_at == null) continue;
      if (!inHalfOpenRange(r.reviewed_at, thisWeekStart, nextWeekStart)) {
        continue;
      }
      if (entryOwner.get(r.mistake_entry_id) !== student.id) continue;

      buHaftaTekrarSayisi += 1;
      if (r.result === "dogru") buHaftaTekrarDogruSayisi += 1;
    }

    return {
      studentId: student.id,
      studentName: student.full_name?.trim() || "İsimsiz öğrenci",
      buHaftaKayit,
      gecenHaftaKayit,
      degisim: buHaftaKayit - gecenHaftaKayit,
      buHaftaSari,
      buHaftaKirmizi,
      buHaftaTekrarSayisi,
      buHaftaTekrarDogruSayisi,
      tekrarBasariOrani:
        buHaftaTekrarSayisi === 0
          ? null
          : buHaftaTekrarDogruSayisi / buHaftaTekrarSayisi,
    };
  });
}
