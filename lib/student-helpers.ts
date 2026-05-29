// Öğrenci profillerinden hedef sınav, başlama gün farkı, başlangıç gibi türetilen
// gösterim değerleri için paylaşılan yardımcılar.

export type TargetExam = "YKS" | "LGS" | "KPSS" | "ARA_SINIF" | null;

/**
 * Profildeki `grade` alanından öğrencinin hazırlandığı sınav türünü çıkarır.
 * Eğer grade tanımsızsa null döner.
 */
export function gradeToExam(grade: string | null | undefined): TargetExam {
  if (!grade) return null;
  const g = grade.toLowerCase().trim();

  if (g.includes("kpss") || g.includes("üniversite")) return "KPSS";
  if (g === "mezun" || g === "12" || g === "11" || g === "10" || g === "9")
    return "YKS";
  if (g === "8") return "LGS";
  if (g === "5" || g === "6" || g === "7") return "ARA_SINIF";

  return null;
}

/**
 * Hedef sınava karşılık gelen kullanıcı dostu etiket.
 */
export function targetExamLabel(exam: TargetExam): string {
  switch (exam) {
    case "YKS":
      return "YKS Adayı";
    case "LGS":
      return "LGS Adayı";
    case "KPSS":
      return "KPSS Adayı";
    case "ARA_SINIF":
      return "Ara Sınıf";
    default:
      return "Hedef belirlenmedi";
  }
}

/**
 * Hedef sınava karşılık gelen badge renk paleti (MINDORA dark-neon).
 */
export function targetExamColors(exam: TargetExam) {
  switch (exam) {
    case "YKS":
      return {
        bg: "bg-[#7B2FFF]/15",
        border: "border-[#7B2FFF]/35",
        text: "text-[#A78BFF]",
        dot: "bg-[#7B2FFF]",
      };
    case "LGS":
      return {
        bg: "bg-[#4F7CFF]/15",
        border: "border-[#4F7CFF]/35",
        text: "text-[#7AB3FF]",
        dot: "bg-[#4F7CFF]",
      };
    case "KPSS":
      return {
        bg: "bg-[#00D4FF]/15",
        border: "border-[#00D4FF]/35",
        text: "text-[#70E6FF]",
        dot: "bg-[#00D4FF]",
      };
    case "ARA_SINIF":
      return {
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/35",
        text: "text-emerald-300",
        dot: "bg-emerald-500",
      };
    default:
      return {
        bg: "bg-white/5",
        border: "border-white/10",
        text: "text-white/40",
        dot: "bg-white/30",
      };
  }
}

/**
 * Tam isimden iki harfli avatar başlangıcı üretir.
 */
export function initialsFromName(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * "X gün önce" gibi insan dostu bir zaman ifadesi üretir.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "az önce";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk önce`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} sa önce`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} gün önce`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} ay önce`;
  const year = Math.floor(month / 12);
  return `${year} yıl önce`;
}
