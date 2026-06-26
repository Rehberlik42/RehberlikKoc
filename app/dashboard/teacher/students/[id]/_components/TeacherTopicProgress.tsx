"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  BookOpen,
  CheckCheck,
  AlertCircle,
  MapPin,
} from "lucide-react";
import TopicRow, {
  type ProgressStatus,
  STATUS_CONFIG,
} from "@/app/dashboard/student/progress/_components/TopicRow";

export interface TeacherTopicProgressSubject {
  id: number;
  name: string;
  color: string | null;
  topics: {
    id: number;
    name: string;
    progress: { status: ProgressStatus; completion_percentage: number } | null;
  }[];
}

interface Props {
  studentId: string;
  subjects: TeacherTopicProgressSubject[];
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

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

function SubjectAccordion({
  subject,
  studentId,
  progressMap,
  isOpen,
  onToggle,
  onTopicUpdate,
  showToast,
}: {
  subject: TeacherTopicProgressSubject;
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
  const pct =
    topics.length === 0 ? 0 : Math.round((completedCount / topics.length) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] transition-all duration-200 hover:border-[var(--border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 bg-[var(--surface)]/60 px-5 py-4 text-left transition-colors duration-200 hover:bg-[var(--surface)]/90"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)]"
          style={{
            background: subject.color
              ? `${subject.color}22`
              : "rgba(123,47,255,0.15)",
            borderColor: subject.color ? `${subject.color}30` : undefined,
          }}
        >
          <BookOpen
            className="h-4 w-4"
            style={{ color: subject.color ?? "#A78BFF" }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{subject.name}</span>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] shadow-[0_0_8px_rgba(123,47,255,0.35)] transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
              {completedCount}/{topics.length}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="divide-y divide-white/3 bg-[var(--bg)]/40">
            {topics.length === 0 ? (
              <p className="px-5 py-4 text-xs italic text-[var(--text-muted)]">
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
                            last_studied_at: null,
                          }
                        : topic.progress
                          ? {
                              status: topic.progress.status,
                              completion_percentage:
                                topic.progress.completion_percentage,
                              last_studied_at: null,
                            }
                          : null
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

/**
 * Yazma yetkisi RLS'teki topic_progress_*_teacher politikalarıyla
 * (is_teacher_of_student) sınırlıdır. Bileşen client-side olsa da RLS
 * sunucuda denetler; öğretmen yalnızca kendi öğrencisine yazabilir.
 * studentId client'tan gönderilir — RLS son sözü söyler.
 */
export default function TeacherTopicProgress({ studentId, subjects }: Props) {
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
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter(
    (t) =>
      (progressMap.get(t.id)?.status ?? t.progress?.status) === "completed"
  ).length;

  if (subjects.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 text-center backdrop-blur-md">
        <BookOpen className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Müfredat verisi bulunamadı
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/25 to-[var(--primary-2)]/15">
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Konu İlerlemesi</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Öğrencinin konu durumunu güncelleyebilirsiniz
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center">
              <p className="text-lg font-black text-[var(--text-primary)]">{completedTopics}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Bitti
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center">
              <p className="text-lg font-black text-[var(--text-primary)]">{totalTopics}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Toplam
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {(
            Object.entries(STATUS_CONFIG) as [
              ProgressStatus,
              (typeof STATUS_CONFIG)[ProgressStatus],
            ][]
          ).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cfg.color}>{cfg.icon}</span>
              <span className="text-xs text-[var(--text-muted)]">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-4">
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

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
