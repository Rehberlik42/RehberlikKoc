"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, Clock, CheckCircle2, Target } from "lucide-react";

// Haftalık hedefler — kolayca güncellenebilir sabitler
const WEEKLY_GOALS = {
  sessions: 7,
  questions: 500,
  minutes: 600,
} as const;

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

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

function useAnimatedNumber(target: number, active: boolean, duration = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(target * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active, duration]);

  return value;
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.08] ${className}`}
      aria-hidden
    />
  );
}

export default function WeeklySummary({
  refreshKey = 0,
}: {
  refreshKey?: number;
}) {
  const supabase = createClient();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [barsMounted, setBarsMounted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBarsMounted(false);
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

  useEffect(() => {
    if (loading || !stats) {
      setBarsMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setBarsMounted(true));
    return () => cancelAnimationFrame(id);
  }, [loading, stats, refreshKey]);

  const net = stats ? calcNet(stats.totalCorrect, stats.totalWrong) : 0;
  const ready = !loading && stats !== null;

  const animatedSessions = useAnimatedNumber(stats?.sessionCount ?? 0, ready);
  const animatedQuestions = useAnimatedNumber(stats?.totalQuestions ?? 0, ready);
  const animatedMinutes = useAnimatedNumber(stats?.totalMinutes ?? 0, ready);
  const animatedNet = useAnimatedNumber(net, ready, 700);

  const sessionPct = stats
    ? Math.min(100, (stats.sessionCount / WEEKLY_GOALS.sessions) * 100)
    : 0;
  const questionPct = stats
    ? Math.min(100, (stats.totalQuestions / WEEKLY_GOALS.questions) * 100)
    : 0;
  const minutePct = stats
    ? Math.min(100, (stats.totalMinutes / WEEKLY_GOALS.minutes) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          icon={<CalendarDays className="h-4 w-4" />}
          label="Bu hafta oturum"
          value={String(Math.round(animatedSessions))}
          accent="#7B2FFF"
          delay={0}
          loading={loading}
        />
        <MiniStat
          icon={<Target className="h-4 w-4" />}
          label="Çözülen soru"
          value={String(Math.round(animatedQuestions))}
          accent="#4F7CFF"
          delay={50}
          loading={loading}
        />
        <MiniStat
          icon={<Clock className="h-4 w-4" />}
          label="Toplam süre"
          value={`${Math.round(animatedMinutes)} dk`}
          accent="#00D4FF"
          delay={100}
          loading={loading}
        />
        <MiniStat
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Haftalık net"
          value={animatedNet.toFixed(2)}
          sub={stats ? `${stats.activeDays} aktif gün` : undefined}
          accent={net >= 0 ? "#10B981" : "#ef4444"}
          delay={150}
          loading={loading}
          glow={!loading}
          positive={net >= 0}
        />
      </div>

      {/* Haftalık ilerleme hedefleri */}
      {loading ? (
        <div className="space-y-3 rounded-xl border border-white/8 bg-[#0d0d2b]/40 p-4">
          <SkeletonBar className="h-3 w-36" />
          <SkeletonBar className="h-2 w-full" />
          <SkeletonBar className="h-2 w-full" />
          <SkeletonBar className="h-2 w-full" />
          <div className="flex gap-1.5 pt-1">
            {DAY_LABELS.map((d) => (
              <SkeletonBar key={d} className="h-6 flex-1" />
            ))}
          </div>
        </div>
      ) : stats ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both space-y-3 rounded-xl border border-white/8 bg-[#0d0d2b]/40 p-4 duration-300">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Haftalık ilerleme
          </p>

          <GoalBar
            label="Oturum"
            current={stats.sessionCount}
            goal={WEEKLY_GOALS.sessions}
            pct={sessionPct}
            accent="#7B2FFF"
            mounted={barsMounted}
          />
          <GoalBar
            label="Soru"
            current={stats.totalQuestions}
            goal={WEEKLY_GOALS.questions}
            pct={questionPct}
            accent="#4F7CFF"
            mounted={barsMounted}
          />
          <GoalBar
            label="Süre (dk)"
            current={stats.totalMinutes}
            goal={WEEKLY_GOALS.minutes}
            pct={minutePct}
            accent="#00D4FF"
            mounted={barsMounted}
          />

          {/* activeDays: hangi günlerin dolu olduğu verisi yok; ilk N hücreyi dolduruyoruz */}
          <div className="border-t border-white/5 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Aktif günler
              </span>
              <span className="text-[10px] tabular-nums text-white/30">
                {stats.activeDays} / 7
              </span>
            </div>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((day, i) => {
                const filled = i < stats.activeDays;
                return (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`h-2 w-full rounded-full transition-all duration-500 ${
                        filled
                          ? "bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] shadow-[0_0_8px_rgba(123,47,255,0.35)]"
                          : "bg-white/[0.06]"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-semibold ${
                        filled ? "text-[#A78BFF]" : "text-white/25"
                      }`}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoalBar({
  label,
  current,
  goal,
  pct,
  accent,
  mounted,
}: {
  label: string;
  current: number;
  goal: number;
  pct: number;
  accent: string;
  mounted: boolean;
}) {
  const width = mounted ? `${pct}%` : "0%";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-white/50">{label}</span>
        <span className="text-[10px] tabular-nums text-white/40">
          {current} / {goal}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width,
            background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
            boxShadow: mounted ? `0 0 10px ${accent}55` : undefined,
          }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  sub,
  accent,
  delay,
  loading,
  glow = false,
  positive = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  delay: number;
  loading: boolean;
  glow?: boolean;
  positive?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/8 bg-slate-900/50 p-3">
        <SkeletonBar className="mb-2 h-8 w-8 rounded-lg" />
        <SkeletonBar className="mb-2 h-2.5 w-20" />
        <SkeletonBar className="h-6 w-14" />
      </div>
    );
  }

  return (
    <div
      className={`group rounded-xl border border-white/8 bg-slate-900/50 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ${
        glow
          ? positive
            ? "shadow-[0_0_14px_rgba(16,185,129,0.12)]"
            : "shadow-[0_0_14px_rgba(239,68,68,0.12)]"
          : "hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
      }`}
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(135deg, ${accent}08 0%, transparent 60%), rgba(15,23,42,0.5)`,
      }}
    >
      <div
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105"
        style={{
          background: `${accent}18`,
          borderColor: `${accent}40`,
          color: accent,
          boxShadow: `0 0 12px ${accent}22`,
        }}
      >
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-black tabular-nums transition-colors duration-300 ${
          glow && positive
            ? "text-[#10B981]"
            : glow && !positive
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10px] text-white/30">{sub}</p>
      )}
    </div>
  );
}
