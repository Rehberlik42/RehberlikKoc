export const THEME_IDS = [
  "night",
  "cream-gold",
  "cream-emerald",
  "vanilla-navy",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "night";

export function isValidTheme(value: string | null | undefined): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

export function resolveTheme(value: string | null | undefined): ThemeId {
  return isValidTheme(value) ? value : DEFAULT_THEME;
}

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  preview: {
    bg: string;
    surface: string;
    primary: string;
  };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "night",
    label: "Gece",
    description: "Gece çalışanlar için koyu tema",
    preview: { bg: "#07070f", surface: "#0d0d2b", primary: "#7B2FFF" },
  },
  {
    id: "cream-gold",
    label: "Krem & Altın",
    description: "Sıcak, premium his",
    preview: { bg: "#FAF7F0", surface: "#FFFFFF", primary: "#A07030" },
  },
  {
    id: "cream-emerald",
    label: "Krem & Zümrüt",
    description: "Sakin, doğal",
    preview: { bg: "#F4FAF6", surface: "#FFFFFF", primary: "#0E6840" },
  },
  {
    id: "vanilla-navy",
    label: "Vanilya & Lacivert",
    description: "Ferah, güven veren",
    preview: { bg: "#F5F6FF", surface: "#FFFFFF", primary: "#1A2EA0" },
  },
];

export function applyThemeToDocumentRoot(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function applyThemeToShell(theme: ThemeId) {
  if (typeof document === "undefined") return;
  applyThemeToDocumentRoot(theme);
  document
    .querySelectorAll("[data-dashboard-shell]")
    .forEach((el) => el.setAttribute("data-theme", theme));
}
