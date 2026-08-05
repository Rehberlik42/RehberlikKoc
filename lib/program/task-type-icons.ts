import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Circle,
  ClipboardList,
  FileText,
  Hash,
  PlayCircle,
  RotateCcw,
  Tag,
} from "lucide-react";
import type { TaskType } from "@/lib/program/task-payload";

/** 10 görev türü + bilinmeyen tür için fallback. */
export const TASK_TYPE_ICONS: Record<TaskType, LucideIcon> = {
  ders: BookOpen,
  deneme: FileText,
  bras_deneme: BookMarked,
  soru_cozumu: Hash,
  video_izleme: PlayCircle,
  tekrar: RotateCcw,
  yanlis_analizi: AlertCircle,
  odev: ClipboardList,
  manuel: Tag,
  kitap_okuma: BookOpen,
};

export const TASK_TYPE_FALLBACK_ICON: LucideIcon = Circle;

export const TASK_TYPE_SHORT_LABEL: Record<TaskType, string> = {
  ders: "Ders",
  deneme: "Deneme",
  bras_deneme: "Branş Denemesi",
  soru_cozumu: "Soru Çözümü",
  video_izleme: "Video",
  tekrar: "Konu tekrarı",
  yanlis_analizi: "Yanlış analizi",
  odev: "Ödev",
  manuel: "Manuel",
  kitap_okuma: "Kitap Okuma",
};

/**
 * Eski TASK_TYPE_BADGE renklerinin tema token karşılıkları.
 * Hardcoded hex yok — dört temada da okunur.
 */
export const TASK_TYPE_COLOR_VAR: Record<TaskType, string> = {
  ders: "var(--primary-2)",
  deneme: "var(--accent)",
  bras_deneme: "var(--primary-3)",
  soru_cozumu: "var(--primary-2)",
  video_izleme: "var(--primary)",
  tekrar: "var(--warning)",
  yanlis_analizi: "var(--danger)",
  odev: "var(--success)",
  manuel: "var(--text-muted)",
  kitap_okuma: "var(--warning)",
};

export const TASK_TYPE_FALLBACK_COLOR = "var(--text-muted)";

export function getTaskTypeIcon(taskType: string): LucideIcon {
  return (
    TASK_TYPE_ICONS[taskType as TaskType] ?? TASK_TYPE_FALLBACK_ICON
  );
}

export function getTaskTypeShortLabel(taskType: string): string {
  return TASK_TYPE_SHORT_LABEL[taskType as TaskType] ?? "Görev";
}

export function getTaskTypeColorVar(taskType: string): string {
  return (
    TASK_TYPE_COLOR_VAR[taskType as TaskType] ?? TASK_TYPE_FALLBACK_COLOR
  );
}
