"use client";

import { useState, type Ref } from "react";
import type { TaskType } from "@/lib/program/task-payload";
import {
  BookOpen,
  BookMarked,
  Tag,
  FileText,
  Hash,
  PlayCircle,
  RotateCcw,
  AlertCircle,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";

const PRIMARY_TASK_TYPES: {
  value: TaskType;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { value: "ders", label: "Ders", icon: BookOpen },
  { value: "soru_cozumu", label: "Soru Çözümü", icon: Hash },
  { value: "deneme", label: "Deneme", icon: FileText },
  { value: "video_izleme", label: "Video İzleme", icon: PlayCircle },
  { value: "tekrar", label: "Tekrar", icon: RotateCcw },
];

const OTHER_TASK_TYPES: {
  value: TaskType;
  label: string;
  icon: typeof BookOpen;
}[] = [
  { value: "yanlis_analizi", label: "Yanlış Analizi", icon: AlertCircle },
  { value: "odev", label: "Ödev", icon: ClipboardList },
  { value: "manuel", label: "Manuel Görev", icon: Tag },
  { value: "bras_deneme", label: "Branş Denemesi", icon: BookMarked },
  { value: "kitap_okuma", label: "Kitap Okuma", icon: BookOpen },
];

interface Props {
  value: TaskType;
  onChange: (value: TaskType) => void;
  firstFocusRef?: Ref<HTMLButtonElement>;
  /** Geriye dönük uyumluluk — artık kullanılmıyor */
  showLegacy?: boolean;
}

export default function TaskTypePicker({
  value,
  onChange,
  firstFocusRef,
}: Props) {
  const isOtherSelected = OTHER_TASK_TYPES.some((o) => o.value === value);
  const [showOtherTypes, setShowOtherTypes] = useState(() => isOtherSelected);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PRIMARY_TASK_TYPES.map((opt, i) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={i === 0 ? firstFocusRef : undefined}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-semibold leading-tight">
                {opt.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowOtherTypes((v) => !v)}
          className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
            showOtherTypes || isOtherSelected
              ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
          }`}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0" />
          <span className="text-[11px] font-semibold leading-tight">Diğer</span>
        </button>
      </div>

      {(showOtherTypes || isOtherSelected) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {OTHER_TASK_TYPES.map((opt) => {
            const Icon = opt.icon;
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-semibold leading-tight">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
