"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, BookOpen, Loader2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  calcCompletionPct,
  calcResourceNet,
  type ResourceTopicRow,
  type StudentLite,
  type StudyResource,
  type TopicProgressRow,
  type TopicProgressTotals,
} from "./resource-types";

interface Props {
  resource: StudyResource;
  students: StudentLite[];
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

function buildTopicProgressRows(
  topicRows: ResourceTopicRow[],
  tasks: {
    study_resource_topic_id: number | null;
    solved_count: number | null;
    correct_count: number | null;
    wrong_count: number | null;
  }[]
): TopicProgressRow[] {
  const progressByTopic = new Map<number, TopicProgressTotals>();
  const uncategorized = emptyTotals();

  for (const task of tasks) {
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

  return rows;
}

export default function ResourceDetailModal({ resource, students, onClose }: Props) {
  const [resourceTopics, setResourceTopics] = useState<ResourceTopicRow[]>([]);
  const [topics, setTopics] = useState<TopicProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setAssignmentsLoading(true);
      setError(null);
      setAssignError(null);
      setProgressError(null);

      const supabase = createClient();
      const [topicsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("study_resource_topics")
          .select("id, name, target_count, order_index")
          .eq("resource_id", resource.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("resource_assignments")
          .select("id, student_id")
          .eq("study_resource_id", resource.id),
      ]);

      if (cancelled) return;

      if (!assignmentsRes.error) {
        setAssignedStudentIds(
          new Set((assignmentsRes.data ?? []).map((row) => row.student_id))
        );
      }
      setAssignmentsLoading(false);

      if (topicsRes.error) {
        setError(topicsRes.error.message ?? "Veriler yüklenemedi");
        setResourceTopics([]);
        setTopics([]);
        setLoading(false);
        return;
      }

      const topicRows = (topicsRes.data ?? []) as ResourceTopicRow[];
      setResourceTopics(topicRows);
      setTopics([]);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, resource.id]);

  const assignedStudents = useMemo(
    () => students.filter((s) => assignedStudentIds.has(s.id)),
    [students, assignedStudentIds]
  );

  useEffect(() => {
    if (assignmentsLoading) return;

    if (assignedStudents.length === 0) {
      setSelectedStudentId(null);
      setTopics([]);
      return;
    }

    setSelectedStudentId((prev) => {
      if (prev && assignedStudentIds.has(prev)) return prev;
      return assignedStudents[0].id;
    });
  }, [assignedStudents, assignedStudentIds, assignmentsLoading]);

  useEffect(() => {
    if (!selectedStudentId) {
      setTopics([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setProgressLoading(true);
      setProgressError(null);

      const supabase = createClient();
      const tasksRes = await supabase
        .from("study_plan_tasks")
        .select("study_resource_topic_id, solved_count, correct_count, wrong_count")
        .eq("study_resource_id", resource.id)
        .eq("student_id", selectedStudentId)
        .eq("is_completed", true)
        .not("solved_count", "is", null);

      if (cancelled) return;

      if (tasksRes.error) {
        setProgressError(tasksRes.error.message ?? "İlerleme yüklenemedi");
        setTopics([]);
        setProgressLoading(false);
        return;
      }

      setTopics(buildTopicProgressRows(resourceTopics, tasksRes.data ?? []));
      setProgressLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, resource.id, resourceTopics]);

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

  const assignedCount = assignedStudentIds.size;

  const selectedStudent = assignedStudents.find((s) => s.id === selectedStudentId);
  const selectedStudentName = selectedStudent?.full_name ?? "Öğrenci";

  async function handleAssignmentToggle(studentId: string) {
    if (togglingId) return;

    const isAssigned = assignedStudentIds.has(studentId);
    setAssignError(null);
    setTogglingId(studentId);

    setAssignedStudentIds((prev) => {
      const next = new Set(prev);
      if (isAssigned) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

    const supabase = createClient();

    if (isAssigned) {
      const { error: deleteError } = await supabase
        .from("resource_assignments")
        .delete()
        .eq("study_resource_id", resource.id)
        .eq("student_id", studentId);

      if (deleteError) {
        setAssignedStudentIds((prev) => {
          const next = new Set(prev);
          next.add(studentId);
          return next;
        });
        setAssignError(deleteError.message);
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAssignedStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        setAssignError("Oturum bulunamadı");
        setTogglingId(null);
        return;
      }

      const { error: insertError } = await supabase.from("resource_assignments").insert({
        study_resource_id: resource.id,
        student_id: studentId,
        assigned_by: user.id,
      });

      if (insertError) {
        setAssignedStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        setAssignError(insertError.message);
      }
    }

    setTogglingId(null);
  }

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
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col animate-in fade-in zoom-in-95 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 duration-200"
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
                  className="text-xl font-bold leading-snug text-[var(--text-primary)]"
                >
                  {resource.name}
                </h2>
                {resource.publisher && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{resource.publisher}</p>
                )}
                {badge && (
                  <span className="mt-3 inline-flex rounded-full border border-[var(--border)] bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] backdrop-blur-sm">
                    {badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-[var(--border)] bg-black/30 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                <p className="mt-3 text-sm">Yükleniyor…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Kapat
                </button>
              </div>
            ) : (
              <>
                {assignedStudents.length === 0 ? (
                  <div className="mb-5 rounded-2xl border border-dashed border-[var(--border)] px-4 py-8 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      Bu kaynak henüz kimseye atanmadı. Aşağıdan öğrenci atayın.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                        Öğrenci
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {assignedStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                              selectedStudentId === student.id
                                ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--text-primary)]"
                                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {student.full_name ?? "Öğrenci"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {progressLoading ? (
                      <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] py-12 text-[var(--text-muted)]">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
                        <p className="mt-2 text-sm">İlerleme yükleniyor…</p>
                      </div>
                    ) : progressError ? (
                      <div className="mb-5 flex flex-col items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-8 text-center">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                        <p className="text-sm text-red-300">{progressError}</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                            {selectedStudentName} · Genel İlerleme
                          </p>
                          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <p className="text-2xl font-black text-[var(--text-primary)]">
                                {summary.solved}
                                <span className="text-lg font-semibold text-[var(--text-muted)]">
                                  {" "}
                                  / {resource.totalQuestions}
                                </span>
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">soru çözüldü</p>
                            </div>
                            <p className="text-lg font-bold text-[var(--accent)]">
                              %{summary.completionPct}
                            </p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={`h-full rounded-full transition-all ${
                                summary.completionPct >= 100
                                  ? "bg-green-500"
                                  : "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
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
                            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                              <span className="text-green-400/90">{summary.correct}D</span>
                              <span className="mx-1 text-[var(--text-muted)]">·</span>
                              <span className="text-red-400/90">{summary.wrong}Y</span>
                              <span className="mx-1 text-[var(--text-muted)]">·</span>
                              <span>
                                net {summary.net >= 0 ? "+" : ""}
                                {summary.net.toFixed(2)}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="mb-5">
                          <div className="mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-[var(--accent)]" />
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                              {selectedStudentName} · Konu Bazlı İlerleme
                            </h3>
                          </div>

                          {topics.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
                              <p className="text-sm text-[var(--text-muted)]">
                                Bu kaynağa henüz konu eklenmemiş
                              </p>
                              <p className="mt-2 text-xs text-[var(--text-muted)]">
                                Konu eklemek için karttaki düzenle ikonunu kullanabilirsiniz
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {topics.map((topic) => {
                                const hasProgress = topic.solved > 0;
                                const allDone =
                                  topic.target_count > 0 && topic.completionPct >= 100;
                                const barWidth =
                                  topic.target_count > 0
                                    ? Math.min(100, (topic.solved / topic.target_count) * 100)
                                    : hasProgress
                                      ? 100
                                      : 0;

                                return (
                                  <div
                                    key={topic.id ?? "uncategorized"}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                                          {topic.name}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                          {hasProgress ? (
                                            <>
                                              <span className="font-semibold text-[var(--text-secondary)]">
                                                {topic.solved}
                                              </span>
                                              {topic.target_count > 0 && (
                                                <>
                                                  <span className="text-[var(--text-muted)]">
                                                    {" "}
                                                    /{" "}
                                                  </span>
                                                  {topic.target_count} soru
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-[var(--text-muted)]">
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
                                            allDone ? "text-green-400" : "text-[var(--accent)]"
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
                                              : "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
                                          }`}
                                          style={{
                                            width: `${hasProgress ? Math.max(barWidth, 2) : 0}%`,
                                          }}
                                        />
                                      </div>
                                    )}

                                    {hasProgress && (
                                      <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                                        <span className="text-green-400/90">D{topic.correct}</span>
                                        <span className="mx-1 text-[var(--text-muted)]">·</span>
                                        <span className="text-red-400/90">Y{topic.wrong}</span>
                                        <span className="mx-1 text-[var(--text-muted)]">·</span>
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
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="mb-5 border-t border-[var(--border)] pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--accent)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Öğrencilere Ata ({assignedCount} atanmış)
                    </h3>
                  </div>

                  {assignError && (
                    <p className="mb-2 text-xs text-red-400">{assignError}</p>
                  )}

                  {assignmentsLoading ? (
                    <div className="flex items-center justify-center py-6 text-[var(--text-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                    </div>
                  ) : students.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                      Henüz öğrenciniz yok
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {students.map((student) => {
                        const assigned = assignedStudentIds.has(student.id);
                        const isToggling = togglingId === student.id;

                        return (
                          <label
                            key={student.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors ${
                              assigned ? "bg-[var(--primary)]/5" : "bg-[var(--surface-2)]"
                            } ${isToggling ? "opacity-70" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={assigned}
                              onChange={() => handleAssignmentToggle(student.id)}
                              disabled={isToggling}
                              className="h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--primary)]"
                            />
                            <span className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">
                              {student.full_name ?? "Öğrenci"}
                            </span>
                            {isToggling && (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--accent)]" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
