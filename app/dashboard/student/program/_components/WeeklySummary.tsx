"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Clock, CheckCircle2, Target } from "lucide-react";

interface WeekStats {
  sessionCount: number;
  totalQuestions: number;
  totalMinutes: number;
  totalCorrect: number;
  totalWrong: number;
  activeDays: number;
}

function calcNet(correct: number, wrong: number) {
  return correct - wrong / 4;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function WeeklySummary({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const supabase = createClient();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const weekStart = startOfWeek(new Date());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("study_sessions")
      .select(
        "study_date, correct_count, wrong_count, questions_solved, duration_minutes"
      )
      .eq("student_id", user.id)
      .gte("study_date", weekStartStr);

    const rows = data ?? [];
    const days = new Set(rows.map((r) => r.study_date));
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalQuestions = 0;
    let totalMinutes = 0;

    for (const r of rows) {
      totalCorrect += r.correct_count ?? 0;
      totalWrong += r.wrong_count ?? 0;
      totalQuestions += r.questions_solved ?? 0;
      totalMinutes += r.duration_minutes ?? 0;
    }

    setStats({
      sessionCount: rows.length,
      totalQuestions,
      totalMinutes,
      totalCorrect,
      totalWrong,
      activeDays: days.size,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const net = stats ? calcNet(stats.totalCorrect, stats.totalWrong) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MiniStat
        icon={<CalendarDays className="w-4 h-4" />}
        label="Bu hafta oturum"
        value={loading ? "…" : String(stats?.sessionCount ?? 0)}
        accent="#7B2FFF"
      />
      <MiniStat
        icon={<Target className="w-4 h-4" />}
        label="Çözülen soru"
        value={loading ? "…" : String(stats?.totalQuestions ?? 0)}
        accent="#4F7CFF"
      />
      <MiniStat
        icon={<Clock className="w-4 h-4" />}
        label="Toplam süre"
        value={loading ? "…" : `${stats?.totalMinutes ?? 0} dk`}
        accent="#00D4FF"
      />
      <MiniStat
        icon={<CheckCircle2 className="w-4 h-4" />}
        label="Haftalık net"
        value={loading ? "…" : net.toFixed(2)}
        sub={stats ? `${stats.activeDays} aktif gün` : undefined}
        accent="#10B981"
      />
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-900/50 p-3">
      <div
        className="w-8 h-8 rounded-lg border flex items-center justify-center mb-2"
        style={{
          background: `${accent}18`,
          borderColor: `${accent}40`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-white text-lg font-black tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-white/30 text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}
