"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, BookOpen, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  calcCompletionPct,
  calcResourceNet,
  type ResourceTopicRow,
  type StudyResource,
  type TopicProgressRow,
  type TopicProgressTotals,
} from "./resource-types";

interface Props {
  resource: StudyResource;
  onClose: () => void;
}

function emptyTotals(): TopicProgressTotals {
  return { solved: 0, correct: 0, wrong: 0 };
}

function addTotals(
  acc: TopicProgressTotals,
  row: { solved_count: number | null; correct_count: number | null; wrong_count: number | null }
) {
  acc.solved += row.solved_count ?? 0;
  acc.correct += row.correct_count ?? 0;
  acc.wrong += row.wrong_count ?? 0;
}

export default function ResourceDetailModal({ resource, onClose }: Props) {
  const [topics, setTopics] = useState<TopicProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const [topicsRes, tasksRes] = await Promise.all([
        supabase
          .from("study_resource_topics")
          .select("id, name, target_count, order_index")
          .eq("resource_id", resource.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("study_plan_tasks")
          .select(
            "study_resource_topic_id, solved_count, correct_count, wrong_count"
          )
          .eq("study_resource_id", resource.id)
          .eq("is_completed", true)
          .not("solved_count", "is", null),
      ]);

      if (cancelled) return;

      if (topicsRes.error || tasksRes.error) {
        setError(
          topicsRes.error?.message ??
            tasksRes.error?.message ??
            "Veriler yüklenemedi"
        );
        setTopics([]);
        setLoading(false);
        return;
      }

      const topicRows = (topicsRes.data ?? []) as ResourceTopicRow[];
      const progressByTopic = new Map<number, TopicProgressTotals>();
      const uncategorized = emptyTotals();

      for (const task of tasksRes.data ?? []) {
        const topicId = task.study_resource_topic_id;
        if (topicId == null) {
          addTotals(uncategorized, task);
        } else {
          const current = progressByTopic.get(topicId) ?? emptyTotals();
          addTotals(current, task);
          progressByTopic.set(topicId, current);
        }
      }

      const rows: TopicProgressRow[] = topicRows.map((topic) => {
        const totals = progressByTopic.get(topic.id) ?? emptyTotals();
        return {
          id: topic.id,
          name: topic.name,
          target_count: topic.target_count,
          order_index: topic.order_index,
          solved: totals.solved,
          correct: totals.correct,
          wrong: totals.wrong,
          completionPct: calcCompletionPct(totals.solved, topic.target_count),
          net: calcResourceNet(totals.correct, totals.wrong),
        };
      });

      if (uncategorized.solved > 0) {
        rows.push({
          id: null,
          name: "Genel / Konusuz",
          target_count: 0,
          order_index: rows.length,
          solved: uncategorized.solved,
          correct: uncategorized.correct,
          wrong: uncategorized.wrong,
          completionPct: 0,
          net: calcResourceNet(uncategorized.correct, uncategorized.wrong),
        });
      }

      setTopics(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, resource.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  const summary = useMemo(() => {
    const solved = topics.reduce((sum, t) => sum + t.solved, 0);
    const correct = topics.reduce((sum, t) => sum + t.correct, 0);
    const wrong = topics.reduce((sum, t) => sum + t.wrong, 0);
    const target = resource.totalQuestions;
    return {
      solved,
      correct,
      wrong,
      net: calcResourceNet(correct, wrong),
      completionPct: calcCompletionPct(solved, target),
    };
  }, [topics, resource.totalQuestions]);

  const badge =
    resource.exam?.name && resource.subject?.name
      ? `${resource.exam.name} · ${resource.subject.name}`
      : resource.exam?.name ?? resource.subject?.name ?? null;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-detail-title"
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col animate-in fade-in zoom-in-95 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 duration-200"
        >
          <div
            className="relative shrink-0 overflow-hidden rounded-t-3xl px-6 py-5"
            style={{ backgroundColor: resource.cover_color }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id="resource-detail-title"
                  className="text-xl font-bold leading-snug text-white"
                >
                  {resource.name}
                </h2>
                {resource.publisher && (
                  <p className="mt-1 text-sm text-white/75">{resource.publisher}</p>
                )}
                {badge && (
                  <span className="mt-3 inline-flex rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                    {badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-white/20 bg-black/30 p-2 text-white/80 backdrop-blur-sm transition-colors hover:text-white"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-white/40">
                <Loader2 className="h-6 w-6 animate-spin text-[#A78BFF]" />
                <p className="mt-3 text-sm">Konu ilerlemesi yükleniyor…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/60 hover:text-white"
                >
                  Kapat
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Genel İlerleme
                  </p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black text-white">
                        {summary.solved}
                        <span className="text-lg font-semibold text-white/40">
                          {" "}
                          / {resource.totalQuestions}
                        </span>
                      </p>
                      <p className="text-xs text-white/40">soru çözüldü</p>
                    </div>
                    <p className="text-lg font-bold text-[#A78BFF]">
                      %{summary.completionPct}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full transition-all ${
                        summary.completionPct >= 100
                          ? "bg-green-500"
                          : "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF]"
                      }`}
                      style={{
                        width: `${
                          summary.solved > 0
                            ? Math.max(
                                summary.completionPct,
                                resource.totalQuestions > 0 ? 2 : 0
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {summary.solved > 0 && (
                    <p className="mt-2 text-[11px] text-white/40">
                      <span className="text-green-400/90">{summary.correct}D</span>
                      <span className="mx-1 text-white/20">·</span>
                      <span className="text-red-400/90">{summary.wrong}Y</span>
                      <span className="mx-1 text-white/20">·</span>
                      <span>
                        net {summary.net >= 0 ? "+" : ""}
                        {summary.net.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#A78BFF]" />
                  <h3 className="text-sm font-bold text-white">Konu Bazlı İlerleme</h3>
                </div>

                {topics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                    <p className="text-sm text-white/40">
                      Bu kaynağa henüz konu eklenmemiş
                    </p>
                    <p className="mt-2 text-xs text-white/25">
                      Konu eklemek için karttaki düzenle ikonunu kullanabilirsiniz
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topics.map((topic) => {
                      const hasProgress = topic.solved > 0;
                      const allDone = topic.target_count > 0 && topic.completionPct >= 100;
                      const barWidth =
                        topic.target_count > 0
                          ? Math.min(100, (topic.solved / topic.target_count) * 100)
                          : hasProgress
                            ? 100
                            : 0;

                      return (
                        <div
                          key={topic.id ?? "uncategorized"}
                          className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white">{topic.name}</p>
                              <p className="mt-0.5 text-[11px] text-white/40">
                                {hasProgress ? (
                                  <>
                                    <span className="font-semibold text-white/60">
                                      {topic.solved}
                                    </span>
                                    {topic.target_count > 0 && (
                                      <>
                                        <span className="text-white/25"> / </span>
                                        {topic.target_count} soru
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-white/30">
                                    {topic.target_count > 0
                                      ? `0 / ${topic.target_count} soru`
                                      : "Henüz çözüm yok"}
                                  </span>
                                )}
                              </p>
                            </div>
                            {topic.target_count > 0 && (
                              <span
                                className={`text-xs font-bold ${
                                  allDone ? "text-green-400" : "text-[#A78BFF]"
                                }`}
                              >
                                %{topic.completionPct}
                              </span>
                            )}
                          </div>

                          {topic.target_count > 0 && (
                            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  allDone
                                    ? "bg-green-500"
                                    : "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF]"
                                }`}
                                style={{
                                  width: `${hasProgress ? Math.max(barWidth, 2) : 0}%`,
                                }}
                              />
                            </div>
                          )}

                          {hasProgress && (
                            <p className="mt-2 text-[10px] text-white/40">
                              <span className="text-green-400/90">D{topic.correct}</span>
                              <span className="mx-1 text-white/20">·</span>
                              <span className="text-red-400/90">Y{topic.wrong}</span>
                              <span className="mx-1 text-white/20">·</span>
                              <span>
                                net {topic.net >= 0 ? "+" : ""}
                                {topic.net.toFixed(2)}
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
