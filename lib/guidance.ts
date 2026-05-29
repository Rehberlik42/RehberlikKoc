// Rehberlik icerikleri — tip, filtre ve gosterim yardimcilari

export type GuidanceContentType = "blog" | "video" | "pdf";
export type TargetExam = "YKS" | "LGS" | "KPSS" | "ARA_SINIF" | null;

export interface GuidanceContent {
  id: number;
  title: string;
  description: string | null;
  content_type: GuidanceContentType;
  url: string | null;
  body: string | null;
  target_exam: TargetExam;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type GuidanceFilter = "all" | GuidanceContentType;

export const FILTER_CHIPS: {
  id: GuidanceFilter;
  label: string;
  emoji: string;
}[] = [
  { id: "all", label: "Tümü", emoji: "✨" },
  { id: "blog", label: "Bloglar", emoji: "📖" },
  { id: "video", label: "Videolar", emoji: "🎥" },
  { id: "pdf", label: "Üniversite Kılavuzları", emoji: "📄" },
];

export function typeMeta(type: GuidanceContentType) {
  switch (type) {
    case "blog":
      return {
        label: "Blog",
        cta: "Oku",
        accent: "#7B2FFF",
        glow: "rgba(123,47,255,0.45)",
      };
    case "video":
      return {
        label: "Video",
        cta: "İzle",
        accent: "#ef4444",
        glow: "rgba(239,68,68,0.4)",
      };
    case "pdf":
      return {
        label: "Kılavuz",
        cta: "İndir",
        accent: "#4F7CFF",
        glow: "rgba(79,124,255,0.4)",
      };
  }
}

export function examBadgeLabel(exam: TargetExam): string | null {
  if (!exam) return null;
  switch (exam) {
    case "YKS":
      return "YKS";
    case "LGS":
      return "LGS";
    case "KPSS":
      return "KPSS";
    case "ARA_SINIF":
      return "Ara Sınıf";
    default:
      return exam;
  }
}

/** YouTube watch / youtu.be → embed URL */
export function toEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/"))
        return url;
    }
    return url;
  } catch {
    return url;
  }
}

/** Kapak yoksa tip bazli gradient placeholder */
export function fallbackCoverStyle(type: GuidanceContentType): string {
  switch (type) {
    case "blog":
      return "linear-gradient(135deg, #1a0a3e 0%, #2d1b69 50%, #0d0d2b 100%)";
    case "video":
      return "linear-gradient(135deg, #3b0a0a 0%, #5c1a1a 50%, #0d0d2b 100%)";
    case "pdf":
      return "linear-gradient(135deg, #0a1a3e 0%, #1b3d69 50%, #0d0d2b 100%)";
  }
}
