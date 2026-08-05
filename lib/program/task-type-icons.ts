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

export function getTaskTypeIcon(taskType: string): LucideIcon {
  return (
    TASK_TYPE_ICONS[taskType as TaskType] ?? TASK_TYPE_FALLBACK_ICON
  );
}

export function getTaskTypeShortLabel(taskType: string): string {
  return TASK_TYPE_SHORT_LABEL[taskType as TaskType] ?? "Görev";
}
