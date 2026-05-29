// Psikolojik test yapıları, skorlama ve yorumlama yardımcıları.
// `psychological_tests.questions` jsonb kolonunun şeması bu dosyada tanımlıdır.

export type TestType = "motivation" | "anxiety" | "focus" | "burnout" | "general";
export type TestLevel = "low" | "medium" | "high";

export interface TestItem {
  id: number;
  text: string;
  /** true ise: skor (max+min) - cevap ile ters çevrilir */
  reverse: boolean;
}

export interface TestScale {
  min: number;            // genelde 1
  max: number;            // genelde 5
  labels: string[];       // ["Hiç katılmıyorum", ... "Tamamen katılıyorum"]
}

export interface TestInterpretation {
  min: number;            // aralık başlangıcı (dahil)
  max: number;            // aralık sonu (dahil)
  label: string;          // "Düşük" / "Orta" / "Yüksek" / kategoriye özel
  level: TestLevel;
  summary: string;        // kullanıcıya gösterilecek özet
  doraSuggestion: string; // DORA'nın kişiselleştirilmiş önerisi
}

/** psychological_tests.questions jsonb'sinin tam şeması */
export interface TestDefinition {
  items: TestItem[];
  scale: TestScale;
  interpretations: TestInterpretation[];
}

/** Tablo satırı: id, başlık ve definition'ı tek pakette taşır */
export interface PsychologicalTest {
  id: number;
  title: string;
  description: string | null;
  type: TestType;
  questions: TestDefinition;
  is_active: boolean;
  created_at: string;
}

// ─── Skorlama ──────────────────────────────────────────────────────────────

/**
 * Cevapları (questionId -> Likert puanı) toplam skora dönüştürür.
 * Ters puanlanan sorularda (max + min) - answer formülünü uygular.
 */
export function calculateScore(
  definition: TestDefinition,
  answers: Record<number, number>
): number {
  const { items, scale } = definition;
  let total = 0;
  for (const item of items) {
    const raw = answers[item.id];
    if (typeof raw !== "number") continue;
    total += item.reverse ? scale.max + scale.min - raw : raw;
  }
  return total;
}

/**
 * Verilen toplam skor için ilgili yorum aralığını bulur.
 * Hiçbir aralığa girmiyorsa null döner.
 */
export function interpretScore(
  definition: TestDefinition,
  score: number
): TestInterpretation | null {
  for (const i of definition.interpretations) {
    if (score >= i.min && score <= i.max) return i;
  }
  return null;
}

/** Tamamı doldurulmuş mu kontrolü */
export function isComplete(
  definition: TestDefinition,
  answers: Record<number, number>
): boolean {
  return definition.items.every((item) => typeof answers[item.id] === "number");
}

/** Min / max teorik skor aralıkları */
export function scoreRange(definition: TestDefinition): {
  min: number;
  max: number;
} {
  const itemCount = definition.items.length;
  return {
    min: itemCount * definition.scale.min,
    max: itemCount * definition.scale.max,
  };
}

// ─── Görsel yardımcılar ─────────────────────────────────────────────────────

export type TestTone = {
  /** badge bg */ bg: string;
  /** badge border */ border: string;
  /** text color */ text: string;
  /** glow rgba string */ glow: string;
  /** ring class */ ring: string;
};

/** Seviyeye göre dark-neon palet */
export function levelTone(level: TestLevel | undefined | null): TestTone {
  switch (level) {
    case "low":
      // Anxiety için "low" iyidir, focus/motivation için kötüdür — UI tarafında
      // başlık metniyle birlikte anlam kazanır. Burada yalnız renk paleti veriyoruz.
      return {
        bg: "bg-amber-500/15",
        border: "border-amber-500/30",
        text: "text-amber-300",
        glow: "rgba(245,158,11,0.35)",
        ring: "ring-amber-500/30",
      };
    case "medium":
      return {
        bg: "bg-[#4F7CFF]/15",
        border: "border-[#4F7CFF]/30",
        text: "text-[#7AB3FF]",
        glow: "rgba(79,124,255,0.35)",
        ring: "ring-[#4F7CFF]/30",
      };
    case "high":
      return {
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/30",
        text: "text-emerald-300",
        glow: "rgba(16,185,129,0.35)",
        ring: "ring-emerald-500/30",
      };
    default:
      return {
        bg: "bg-white/5",
        border: "border-white/10",
        text: "text-white/40",
        glow: "rgba(255,255,255,0.1)",
        ring: "ring-white/10",
      };
  }
}

/**
 * Test türü için sembolik renk + Türkçe etiket.
 * UI'da ikon renkleri ve badge metinleri için kullanılır.
 */
export function typeMeta(type: TestType | string | null | undefined): {
  label: string;
  color: string;
  description: string;
} {
  switch (type) {
    case "anxiety":
      return {
        label: "Kaygı",
        color: "#F59E0B",
        description: "Stres ve kaygı düzeyini ölçer.",
      };
    case "focus":
      return {
        label: "Odaklanma",
        color: "#4F7CFF",
        description: "Çalışma alışkanlıkları ve odaklanmayı ölçer.",
      };
    case "motivation":
      return {
        label: "Motivasyon",
        color: "#7B2FFF",
        description: "İçsel motivasyon ve kararlılığı ölçer.",
      };
    case "burnout":
      return {
        label: "Tükenmişlik",
        color: "#F43F5E",
        description: "Akademik yorgunluk seviyesini ölçer.",
      };
    case "general":
    default:
      return {
        label: "Genel",
        color: "#00D4FF",
        description: "Genel akademik durum değerlendirmesi.",
      };
  }
}
