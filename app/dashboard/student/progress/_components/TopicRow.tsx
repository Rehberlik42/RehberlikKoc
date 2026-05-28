"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Circle, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "needs_review";

export interface TopicProgressData {
  status: ProgressStatus;
  completion_percentage: number;
  last_studied_at: string | null;
}

export interface TopicRowProps {
  topicId: number;
  topicName: string;
  studentId: string;
  initialProgress: TopicProgressData | null;
  onUpdate: (topicId: number, status: ProgressStatus, percentage: number) => void;
  showToast: (type: "success" | "error", msg: string) => void;
}

// ─── Configs ─────────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; icon: React.ReactNode; color: string; barClass: string; pct: number }
> = {
  not_started: {
    label: "Başlamadı",
    icon: <Circle className="w-3.5 h-3.5" />,
    color: "text-white/30",
    barClass: "bg-white/15",
    pct: 0,
  },
  in_progress: {
    label: "Çalışıyorum",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    color: "text-[#7AB3FF]",
    barClass: "bg-gradient-to-r from-[#4F7CFF] to-[#00D4FF]",
    pct: 50,
  },
  needs_review: {
    label: "Tekrar Lazım",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: "text-orange-400",
    barClass: "bg-gradient-to-r from-orange-500 to-orange-400",
    pct: 65,
  },
  completed: {
    label: "Tamamlandı",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: "text-[#A78BFF]",
    barClass: "bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF]",
    pct: 100,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function TopicRow({
  topicId,
  topicName,
  studentId,
  initialProgress,
  onUpdate,
  showToast,
}: TopicRowProps) {
  const supabase = createClient();

  const [status, setStatus] = useState<ProgressStatus>(
    initialProgress?.status ?? "not_started"
  );
  const [percentage, setPercentage] = useState<number>(
    initialProgress?.completion_percentage ?? 0
  );
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[status];

  const handleChange = async (newStatus: ProgressStatus) => {
    const newPct = STATUS_CONFIG[newStatus].pct;
    // Optimistik guncelle
    setStatus(newStatus);
    setPercentage(newPct);
    setSaving(true);

    const { error } = await supabase.from("topic_progress").upsert(
      {
        student_id: studentId,
        topic_id: topicId,
        status: newStatus,
        completion_percentage: newPct,
        last_studied_at: new Date().toISOString(),
      },
      { onConflict: "student_id,topic_id" }
    );

    setSaving(false);

    if (error) {
      // Geri al
      setStatus(initialProgress?.status ?? "not_started");
      setPercentage(initialProgress?.completion_percentage ?? 0);
      showToast("error", "Kayıt hatası: " + error.message);
      return;
    }

    onUpdate(topicId, newStatus, newPct);
    if (newStatus === "completed") {
      showToast("success", `"${topicName}" tamamlandı! 🎯`);
    }
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/2 transition-all duration-200">
      {/* Konu adı */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate transition-colors duration-200 ${
            status === "completed" ? "text-white/50 line-through" : "text-white/80"
          }`}
        >
          {topicName}
        </p>
        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Yüzde */}
      <span
        className={`text-xs font-bold w-7 text-right tabular-nums shrink-0 ${cfg.color}`}
      >
        {percentage}%
      </span>

      {/* Status select */}
      <div className="relative shrink-0">
        {saving ? (
          <div className="w-28 h-7 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
          </div>
        ) : (
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as ProgressStatus)}
            className={`
              appearance-none w-28 h-7 pl-6 pr-2 rounded-lg text-[11px] font-semibold
              bg-white/4 border border-white/8 cursor-pointer
              focus:outline-none transition-all duration-200
              ${cfg.color}
            `}
            onFocus={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 0 2px #7B2FFF55, 0 0 8px #7B2FFF22")
            }
            onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
          >
            {(Object.entries(STATUS_CONFIG) as [ProgressStatus, typeof STATUS_CONFIG[ProgressStatus]][]).map(
              ([key, val]) => (
                <option key={key} value={key} className="bg-[#0d0d2b] text-white">
                  {val.label}
                </option>
              )
            )}
          </select>
        )}
        {/* Leading icon inside select */}
        <div
          className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 ${cfg.color}`}
        >
          {cfg.icon}
        </div>
      </div>
    </div>
  );
}
