"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  BookOpen,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import TopicRow, {
  type ProgressStatus,
  type TopicProgressData,
  STATUS_CONFIG,
} from "./TopicRow";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TopicWithProgress {
  id: number;
  name: string;
  order_index: number;
  progress: TopicProgressData | null;
}

export interface SubjectWithTopics {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  order_index: number;
  exam: { name: string } | null;
  topics: TopicWithProgress[];
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

function useMountAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return mounted;
}

function useAnimatedNumber(target: number, active: boolean, duration = 900) {
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
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, active, duration]);

  return value;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  toast,
  onClose,
}: {
  toast: ToastState;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose, toast]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-2xl ${
        toast.type === "success"
          ? "border-green-500/30 bg-[#0a1a0a] text-green-400 shadow-green-500/10"
          : "border-red-500/30 bg-[#1a0a0a] text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

// ─── Overall Progress Ring ────────────────────────────────────────────────────
function OverallRing({
  completed,
  inProgress,
  needsReview,
  total,
}: {
  completed: number;
  inProgress: number;
  needsReview: number;
  total: number;
}) {
  const mounted = useMountAnimation();
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const displayPct = useAnimatedNumber(pct, mounted);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const completedWidth = total === 0 ? 0 : (completed / total) * 100;
  const inProgressWidth = total === 0 ? 0 : (inProgress / total) * 100;
  const needsReviewWidth = total === 0 ? 0 : (needsReview / total) * 100;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d2b]/80 to-[#07070f]/80 p-6 md:p-8">
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#7B2FFF]/8 blur-[60px]" />

      <div className="relative flex flex-col items-center gap-8 sm:flex-row">
        {/* SVG Ring */}
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 130 130" className="-rotate-90">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7B2FFF" />
                <stop offset="50%" stopColor="#4F7CFF" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
            />
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={mounted ? offset : circ}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-3xl font-black text-transparent">
              {displayPct}%
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Genel
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid w-full flex-1 grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/3 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Toplam Konu</p>
            <p className="text-2xl font-black text-white">{total}</p>
          </div>
          <div className="rounded-xl border border-[#7B2FFF]/20 bg-[#7B2FFF]/10 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#A78BFF]">Tamamlandı</p>
            <p className="text-2xl font-black text-white">{completed}</p>
          </div>
          <div className="rounded-xl border border-[#4F7CFF]/20 bg-[#4F7CFF]/10 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-[#7AB3FF]">Çalışıyorum</p>
            <p className="text-2xl font-black text-white">{inProgress}</p>
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-orange-400">Tekrar Lazım</p>
            <p className="text-2xl font-black text-white">{needsReview}</p>
          </div>
        </div>
      </div>

      {/* Multi-segment overall bar */}
      <div className="relative mt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/30">
            Müfredat Tamamlanma
          </span>
          <span className="text-xs font-bold text-white/50">
            {completed}/{total}
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5">
          {completedWidth > 0 && (
            <div
              className="h-full bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] shadow-[0_0_10px_rgba(123,47,255,0.45)] transition-[width] duration-1000 ease-out"
              style={{ width: mounted ? `${completedWidth}%` : "0%" }}
            />
          )}
          {inProgressWidth > 0 && (
            <div
              className="h-full bg-[#4F7CFF] shadow-[0_0_8px_rgba(79,124,255,0.4)] transition-[width] duration-1000 ease-out"
              style={{
                width: mounted ? `${inProgressWidth}%` : "0%",
                transitionDelay: "80ms",
              }}
            />
          )}
          {needsReviewWidth > 0 && (
            <div
              className="h-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.4)] transition-[width] duration-1000 ease-out"
              style={{
                width: mounted ? `${needsReviewWidth}%` : "0%",
                transitionDelay: "160ms",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subject Accordion ────────────────────────────────────────────────────────
function SubjectAccordion({
  subject,
  studentId,
  progressMap,
  isOpen,
  onToggle,
  onTopicUpdate,
  showToast,
}: {
  subject: SubjectWithTopics;
  studentId: string;
  progressMap: Map<number, { status: ProgressStatus; percentage: number }>;
  isOpen: boolean;
  onToggle: () => void;
  onTopicUpdate: (topicId: number, status: ProgressStatus, pct: number) => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const mounted = useMountAnimation();
  const topics = subject.topics;
  const completedCount = topics.filter(
    (t) => (progressMap.get(t.id)?.status ?? t.progress?.status) === "completed"
  ).length;
  const pct = topics.length === 0 ? 0 : Math.round((completedCount / topics.length) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/6 transition-all duration-200 hover:border-white/10">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 bg-[#0d0d2b]/60 px-5 py-4 text-left transition-colors duration-200 hover:bg-[#0d0d2b]/90"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10"
          style={{
            background: subject.color
              ? `${subject.color}22`
              : "rgba(123,47,255,0.15)",
            borderColor: subject.color ? `${subject.color}30` : undefined,
          }}
        >
          <BookOpen
            className="h-4.5 w-4.5"
            style={{ color: subject.color ?? "#A78BFF" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{subject.name}</span>
            {subject.exam && (
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/30">
                {subject.exam.name}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] shadow-[0_0_8px_rgba(123,47,255,0.35)] transition-[width] duration-700 ease-out"
                style={{ width: mounted ? `${pct}%` : "0%" }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-white/30">
              {completedCount}/{topics.length}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="divide-y divide-white/3 bg-[#07070f]/40">
            {topics.length === 0 ? (
              <p className="px-5 py-4 text-xs italic text-white/20">
                Bu derse ait konu bulunamadı.
              </p>
            ) : (
              topics.map((topic) => {
                const cached = progressMap.get(topic.id);
                return (
                  <TopicRow
                    key={topic.id}
                    topicId={topic.id}
                    topicName={topic.name}
                    studentId={studentId}
                    initialProgress={
                      cached
                        ? {
                            status: cached.status,
                            completion_percentage: cached.percentage,
                            last_studied_at: topic.progress?.last_studied_at ?? null,
                          }
                        : topic.progress
                    }
                    onUpdate={onTopicUpdate}
                    showToast={showToast}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function ProgressClient({
  subjects,
  studentId,
}: {
  subjects: SubjectWithTopics[];
  studentId: string;
}) {
  const pageMounted = useMountAnimation();
  const [openId, setOpenId] = useState<number | null>(subjects[0]?.id ?? null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [progressMap, setProgressMap] = useState<
    Map<number, { status: ProgressStatus; percentage: number }>
  >(() => {
    const map = new Map<number, { status: ProgressStatus; percentage: number }>();
    subjects.forEach((s) =>
      s.topics.forEach((t) => {
        if (t.progress) {
          map.set(t.id, {
            status: t.progress.status,
            percentage: t.progress.completion_percentage,
          });
        }
      })
    );
    return map;
  });

  const handleTopicUpdate = useCallback(
    (topicId: number, status: ProgressStatus, percentage: number) => {
      setProgressMap((prev) => {
        const next = new Map(prev);
        next.set(topicId, { status, percentage });
        return next;
      });
    },
    []
  );

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  const allTopics = subjects.flatMap((s) => s.topics);
  const total = allTopics.length;

  const counts = { completed: 0, in_progress: 0, needs_review: 0, not_started: 0 };
  allTopics.forEach((t) => {
    const st = progressMap.get(t.id)?.status ?? t.progress?.status ?? "not_started";
    counts[st]++;
  });

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <OverallRing
        completed={counts.completed}
        inProgress={counts.in_progress}
        needsReview={counts.needs_review}
        total={total}
      />

      <div className="flex flex-wrap items-center gap-3 px-1">
        {(Object.entries(STATUS_CONFIG) as [ProgressStatus, typeof STATUS_CONFIG[ProgressStatus]][]).map(
          ([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cfg.color}>{cfg.icon}</span>
              <span className="text-xs text-white/30">{cfg.label}</span>
            </div>
          )
        )}
      </div>

      <div className="space-y-3">
        {subjects.map((subject, index) => (
          <div
            key={subject.id}
            className="transition-all duration-500 ease-out"
            style={{
              opacity: pageMounted ? 1 : 0,
              transform: pageMounted ? "translateY(0)" : "translateY(8px)",
              transitionDelay: `${Math.min(index * 60, 360)}ms`,
            }}
          >
            <SubjectAccordion
              subject={subject}
              studentId={studentId}
              progressMap={progressMap}
              isOpen={openId === subject.id}
              onToggle={() =>
                setOpenId((prev) => (prev === subject.id ? null : subject.id))
              }
              onTopicUpdate={handleTopicUpdate}
              showToast={showToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
