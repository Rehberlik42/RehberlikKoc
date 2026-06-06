"use client";

import { useState, useEffect } from "react";
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

const BAR_GLOW: Record<ProgressStatus, string> = {
  not_started: "",
  in_progress: "shadow-[0_0_10px_rgba(79,124,255,0.45)]",
  needs_review: "shadow-[0_0_10px_rgba(251,146,60,0.45)]",
  completed: "shadow-[0_0_12px_rgba(123,47,255,0.55)]",
};

function useMountAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
}

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
  const mounted = useMountAnimation();

  const [status, setStatus] = useState<ProgressStatus>(
    initialProgress?.status ?? "not_started"
  );
  const [percentage, setPercentage] = useState<number>(
    initialProgress?.completion_percentage ?? 0
  );
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[status];
  const displayPct = mounted ? percentage : 0;

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
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:-translate-y-px">
      {/* Konu adı */}
      <div className="flex-1 min-w-0">
        <p
          className={`flex items-center gap-1.5 text-sm font-medium truncate transition-colors duration-200 ${
            status === "completed"
              ? "text-white/45 decoration-white/20"
              : "text-white/80"
          }`}
        >
          {status === "completed" && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#A78BFF]/80" />
          )}
          <span className={status === "completed" ? "line-through decoration-white/25" : ""}>
            {topicName}
          </span>
        </p>
        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${cfg.barClass} ${BAR_GLOW[status]}`}
            style={{ width: mounted ? `${percentage}%` : "0%" }}
          />
        </div>
      </div>

      {/* Yüzde */}
      <span
        className={`w-7 shrink-0 text-right text-xs font-bold tabular-nums transition-colors duration-200 ${cfg.color}`}
      >
        {displayPct}%
      </span>

      {/* Status select */}
      <div className="relative shrink-0">
        {saving ? (
          <div className="flex h-7 w-28 items-center justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
          </div>
        ) : (
          <select
            value={status}
            onChange={(e) => handleChange(e.target.value as ProgressStatus)}
            className={`
              h-7 w-28 cursor-pointer appearance-none rounded-lg border border-white/8
              bg-white/4 pl-6 pr-2 text-[11px] font-semibold
              transition-all duration-200 focus:outline-none
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
