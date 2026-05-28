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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-2xl ${
        toast.type === "success"
          ? "bg-[#0a1a0a] border-green-500/30 text-green-400 shadow-green-500/10"
          : "bg-[#1a0a0a] border-red-500/30 text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
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
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#0d0d2b]/80 to-[#07070f]/80 p-6 md:p-8 overflow-hidden relative">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#7B2FFF]/8 blur-[60px] pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-center gap-8">
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
            {/* Track */}
            <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
            {/* Progress */}
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-transparent">
              {pct}%
            </span>
            <span className="text-white/30 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
              Genel
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          <div className="rounded-xl bg-white/3 border border-white/5 px-4 py-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Toplam Konu</p>
            <p className="text-white text-2xl font-black">{total}</p>
          </div>
          <div className="rounded-xl bg-[#7B2FFF]/10 border border-[#7B2FFF]/20 px-4 py-3">
            <p className="text-[#A78BFF] text-[10px] uppercase tracking-wider mb-1">Tamamlandı</p>
            <p className="text-white text-2xl font-black">{completed}</p>
          </div>
          <div className="rounded-xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 px-4 py-3">
            <p className="text-[#7AB3FF] text-[10px] uppercase tracking-wider mb-1">Çalışıyorum</p>
            <p className="text-white text-2xl font-black">{inProgress}</p>
          </div>
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3">
            <p className="text-orange-400 text-[10px] uppercase tracking-wider mb-1">Tekrar Lazım</p>
            <p className="text-white text-2xl font-black">{needsReview}</p>
          </div>
        </div>
      </div>

      {/* Thick overall bar at the bottom */}
      <div className="relative mt-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/30 text-[10px] uppercase tracking-wider">Müfredat Tamamlanma</span>
          <span className="text-white/50 text-xs font-bold">{completed}/{total}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] shadow-[0_0_12px_#7B2FFF60] transition-all duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
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
  const topics = subject.topics;
  const completedCount = topics.filter(
    (t) => (progressMap.get(t.id)?.status ?? t.progress?.status) === "completed"
  ).length;
  const pct = topics.length === 0 ? 0 : Math.round((completedCount / topics.length) * 100);

  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden transition-all duration-200 hover:border-white/10">
      {/* Accordion header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 bg-[#0d0d2b]/60 hover:bg-[#0d0d2b]/90 transition-colors duration-200 text-left"
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
          style={{
            background: subject.color
              ? `${subject.color}22`
              : "rgba(123,47,255,0.15)",
            borderColor: subject.color ? `${subject.color}30` : undefined,
          }}
        >
          <BookOpen
            className="w-4.5 h-4.5"
            style={{ color: subject.color ?? "#A78BFF" }}
          />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{subject.name}</span>
            {subject.exam && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30 font-medium">
                {subject.exam.name}
              </span>
            )}
          </div>
          {/* Mini progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-white/30 text-[10px] font-semibold shrink-0">
              {completedCount}/{topics.length}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Topics list */}
      {isOpen && (
        <div className="divide-y divide-white/3 bg-[#07070f]/40">
          {topics.length === 0 ? (
            <p className="px-5 py-4 text-white/20 text-xs italic">
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
      )}
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
  // Accordion state: ilk dersi acik baslat
  const [openId, setOpenId] = useState<number | null>(subjects[0]?.id ?? null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Tüm topic progress'i yerel map'te tut (optimistik update için)
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

  // Genel istatistikler (progressMap'ten hesapla)
  const allTopics = subjects.flatMap((s) => s.topics);
  const total = allTopics.length;

  const counts = { completed: 0, in_progress: 0, needs_review: 0, not_started: 0 };
  allTopics.forEach((t) => {
    const st = progressMap.get(t.id)?.status ?? t.progress?.status ?? "not_started";
    counts[st]++;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}

      {/* Genel İlerleme Ring */}
      <OverallRing
        completed={counts.completed}
        inProgress={counts.in_progress}
        needsReview={counts.needs_review}
        total={total}
      />

      {/* Konu Durum Açıklaması */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {(Object.entries(STATUS_CONFIG) as [ProgressStatus, typeof STATUS_CONFIG[ProgressStatus]][]).map(
          ([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`${cfg.color}`}>{cfg.icon}</span>
              <span className="text-white/30 text-xs">{cfg.label}</span>
            </div>
          )
        )}
      </div>

      {/* Ders Accordion'ları */}
      <div className="space-y-3">
        {subjects.map((subject) => (
          <SubjectAccordion
            key={subject.id}
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
        ))}
      </div>
    </div>
  );
}
