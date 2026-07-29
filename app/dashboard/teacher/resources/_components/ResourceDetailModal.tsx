"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  Unlink,
  Users,
  X,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCentralTopics, type CentralTopic } from "@/lib/use-central-topics";
import {
  normalizeStatus,
  statusChipClass,
  StatusIcon,
} from "@/lib/resource-status-ui";
import {
  buildTopicErrorAnalysis,
  topicSeverity,
  topicSeverityBg,
  topicSeverityColor,
  type ExamColumnDef,
  type NormalizedExam,
  type RawTopicErrorRecord,
  type TopicErrorAnalysisRow,
  type TopicSeverity,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";
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
  onDelete?: () => void;
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
      // Manuel takip alanlari study_resource_topic_progress'ten gelir (asagida merge)
      status: "calisilmadi",
      student_note: null,
      coach_note: null,
      last_studied_at: null,
      topic_id: topic.topic_id ?? null,
      coach_priority: null,
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
      status: "calisilmadi",
      student_note: null,
      coach_note: null,
      last_studied_at: null,
      topic_id: null,
      coach_priority: null,
    });
  }

  return rows;
}

const STATUS_OPTIONS = [
  { value: "calisilmadi", label: "Çalışılmadı" },
  { value: "baslandi", label: "Başlandı" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "tekrar_gerekli", label: "Tekrar Gerekli" },
] as const;

const STATUS_CYCLE = STATUS_OPTIONS.map((o) => o.value);

const COACH_PRIORITY_OPTIONS = [
  { value: "", label: "Sistem kararına bırak" },
  { value: "dusuk", label: "Düşük" },
  { value: "orta", label: "Orta" },
  { value: "yuksek", label: "Yüksek" },
] as const;

const PRIORITY_VALUES = ["dusuk", "orta", "yuksek"] as const;

type TopicStudentProgress = {
  status: string;
  student_note: string | null;
  coach_note: string | null;
  last_studied_at: string | null;
  coach_priority: string | null;
};

const DEFAULT_TOPIC_PROGRESS: TopicStudentProgress = {
  status: "calisilmadi",
  student_note: null,
  coach_note: null,
  last_studied_at: null,
  coach_priority: null,
};

type ResourceStatus = (typeof STATUS_OPTIONS)[number]["value"];

function normalizeCoachPriority(value: string | null | undefined): string {
  return value && (PRIORITY_VALUES as readonly string[]).includes(value)
    ? value
    : "";
}

function nextStatus(current: string): ResourceStatus {
  const idx = STATUS_CYCLE.indexOf(normalizeStatus(current));
  const i = idx >= 0 ? idx : 0;
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function statusLabel(value: string): string {
  return (
    STATUS_OPTIONS.find((o) => o.value === normalizeStatus(value))?.label ??
    "Çalışılmadı"
  );
}

function severityLabel(severity: TopicSeverity): string {
  switch (severity) {
    case "good":
      return "İyi";
    case "medium":
      return "Orta";
    case "bad":
      return "Kötü";
  }
}

/** Ham hata kayıtlarından buildTopicErrorAnalysis için minimal NormalizedExam listesi */
function examsFromRawErrors(raw: RawTopicErrorRecord[]): NormalizedExam[] {
  const map = new Map<number, NormalizedExam>();
  for (const row of raw) {
    const resultRaw = Array.isArray(row.result) ? row.result[0] : row.result;
    if (!resultRaw) continue;
    const mockExamRaw = Array.isArray(resultRaw.mock_exam)
      ? resultRaw.mock_exam[0]
      : resultRaw.mock_exam;
    if (!mockExamRaw?.id) continue;
    if (map.has(mockExamRaw.id)) continue;
    map.set(mockExamRaw.id, {
      id: mockExamRaw.id,
      exam_date: mockExamRaw.exam_date,
      title: null,
      examId: 0,
      examName: "",
      results: [],
    });
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
  );
}

/**
 * Kart içi mini konu×deneme şeridi — ExamTopicDetail hücre mantığı
 * (appeared / çıkmadı + yanlış adedine göre severity renkleri).
 */
function TopicExamMatrixStrip({
  row,
  examColumns,
}: {
  row: TopicErrorAnalysisRow | null | undefined;
  examColumns: ExamColumnDef[];
}) {
  if (!row || examColumns.length === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]"
        title="Bu konu için deneme verisi yok veya merkezi konuya bağlı değil"
      >
        <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]/50" />
        Sistem riski: Veri yok
      </span>
    );
  }

  return (
    <div
      className="inline-flex max-w-full flex-col gap-1"
      title={`Ort. ${row.avgWrong.toFixed(1)} yanlış · ${severityLabel(row.severity)}`}
    >
      <div className="inline-flex flex-wrap items-center gap-0.5">
        {examColumns.map((col) => {
          const wrongRaw = row.wrongByExamId[col.mockExamId];
          const appeared = wrongRaw !== null;
          const wrong = wrongRaw ?? 0;

          if (!appeared) {
            return (
              <span
                key={col.mockExamId}
                title={`${col.label} (${col.shortDate}): çıkmadı`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-bold text-[var(--text-muted)] opacity-40"
              >
                —
              </span>
            );
          }

          const cellSeverity = topicSeverity(wrong);
          return (
            <span
              key={col.mockExamId}
              title={`${col.label} (${col.shortDate}): ${wrong} yanlış`}
              className="inline-block h-4 w-4 rounded-sm border"
              style={{
                background: topicSeverityBg(cellSeverity),
                borderColor: `${topicSeverityColor(cellSeverity)}55`,
              }}
            />
          );
        })}
      </div>
      <span
        className="text-[9px] font-semibold"
        style={{ color: topicSeverityColor(row.severity) }}
      >
        Ort. {row.avgWrong.toFixed(1)} · {severityLabel(row.severity)}
      </span>
    </div>
  );
}

function formatLastStudied(iso: string | null | undefined): string {
  if (!iso) return "Hiç çalışılmadı";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Hiç çalışılmadı";
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type TopicLinkPatch = {
  topic_id?: number | null;
};

type TopicProgressPatch = {
  status?: string;
  coach_note?: string | null;
  coach_priority?: string | null;
  last_studied_at?: string | null;
  student_note?: string | null;
};

/** Adım 1 TopicEditor'daki Bağla picker'ının detay modalına uyarlanmış hali */
function CentralTopicLinkPicker({
  linkedTopicId,
  curriculumTopics,
  disabled,
  onLink,
  compact = false,
}: {
  linkedTopicId: number | null | undefined;
  curriculumTopics: CentralTopic[];
  disabled?: boolean;
  compact?: boolean;
  onLink: (topicId: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<"root" | "children">("root");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        curriculumTopics
          .map((t) => t.parent_id)
          .filter((id): id is number => id !== null)
      ),
    [curriculumTopics]
  );

  const hasHierarchy = parentIdsWithChildren.size > 0;

  const rootTopics = useMemo(() => {
    if (!hasHierarchy) return curriculumTopics;
    return curriculumTopics.filter((t) => t.parent_id === null);
  }, [curriculumTopics, hasHierarchy]);

  const childTopics = useMemo(() => {
    if (selectedParentId == null) return [];
    return curriculumTopics.filter((t) => t.parent_id === selectedParentId);
  }, [curriculumTopics, selectedParentId]);

  const linkedName = useMemo(() => {
    if (linkedTopicId == null) return null;
    return curriculumTopics.find((t) => t.id === linkedTopicId)?.name ?? null;
  }, [linkedTopicId, curriculumTopics]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const openPicker = () => {
    if (disabled) return;
    setPickerStep("root");
    setSelectedParentId(null);
    setOpen((v) => !v);
  };

  const selectTopic = (id: number) => {
    onLink(id);
    setOpen(false);
  };

  const selectRoot = (t: CentralTopic) => {
    if (hasHierarchy && parentIdsWithChildren.has(t.id)) {
      setSelectedParentId(t.id);
      setPickerStep("children");
      return;
    }
    selectTopic(t.id);
  };

  if (disabled) return null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={openPicker}
        title={
          linkedName
            ? `Bağlı: ${linkedName}`
            : "Merkezi müfredat konusuna bağla"
        }
        aria-label={compact ? "Bağla" : undefined}
        className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
          compact ? "max-w-[2rem] justify-center p-1.5 gap-0" : "max-w-[11rem]"
        } ${
          linkedTopicId != null
            ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--accent)]"
        }`}
      >
        <Link2 className="h-3 w-3 shrink-0" />
        {!compact && (
          <span className="truncate">
            {linkedName
              ? `Bağlı: ${linkedName}`
              : linkedTopicId != null
                ? "Bağlı"
                : "Bağla"}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150">
          {linkedTopicId != null && (
            <button
              type="button"
              onClick={() => {
                onLink(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <Unlink className="h-3.5 w-3.5" />
              Bağlantıyı kaldır
            </button>
          )}

          {curriculumTopics.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
              Bu ders için merkezi konu yok.
            </p>
          ) : pickerStep === "children" ? (
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                type="button"
                onClick={() => {
                  setPickerStep("root");
                  setSelectedParentId(null);
                }}
                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <ChevronLeft className="h-3 w-3" />
                Ana üniteye dön
              </button>
              {childTopics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTopic(t.id)}
                  className="flex w-full items-center px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
                >
                  {t.name}
                </button>
              ))}
              {childTopics.length === 0 && (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  Alt konu yok.
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto py-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {hasHierarchy ? "Ana ünite / konu" : "Konu seç"}
              </p>
              {rootTopics.map((t) => {
                const isParent = parentIdsWithChildren.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectRoot(t)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
                  >
                    <span className="truncate">{t.name}</span>
                    {isParent && (
                      <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
                        alt konular →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResourceDetailModal({ resource, students, onClose, onDelete }: Props) {
  const [resourceTopics, setResourceTopics] = useState<ResourceTopicRow[]>([]);
  const [progressByTopicId, setProgressByTopicId] = useState<
    Record<number, TopicStudentProgress>
  >({});
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<number>>(
    () => new Set()
  );
  const [taskRows, setTaskRows] = useState<
    {
      study_resource_topic_id: number | null;
      solved_count: number | null;
      correct_count: number | null;
      wrong_count: number | null;
    }[]
  >([]);
  const [topicUpdateError, setTopicUpdateError] = useState<string | null>(null);
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
  const [subjectId, setSubjectId] = useState<number | null>(null);
  // Bağlı merkezi konular için toplu deneme hata kayıtları (konu×deneme matrisi)
  const [rawTopicErrors, setRawTopicErrors] = useState<RawTopicErrorRecord[]>(
    []
  );

  const { topics: curriculumTopics } = useCentralTopics(subjectId);

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
      setSubjectId(null);

      const supabase = createClient();
      const [topicsRes, assignmentsRes, resourceRes] = await Promise.all([
        supabase
          .from("study_resource_topics")
          .select("id, name, target_count, order_index, topic_id")
          .eq("resource_id", resource.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("resource_assignments")
          .select("id, student_id")
          .eq("study_resource_id", resource.id),
        supabase
          .from("study_resources")
          .select("subject_id")
          .eq("id", resource.id)
          .single(),
      ]);

      if (cancelled) return;

      if (!assignmentsRes.error) {
        setAssignedStudentIds(
          new Set((assignmentsRes.data ?? []).map((row) => row.student_id))
        );
      }
      setAssignmentsLoading(false);

      if (!resourceRes.error && resourceRes.data) {
        setSubjectId(resourceRes.data.subject_id ?? null);
      }

      if (topicsRes.error) {
        setError(topicsRes.error.message ?? "Veriler yüklenemedi");
        setResourceTopics([]);
        setLoading(false);
        return;
      }

      const topicRows = (topicsRes.data ?? []).map((row) => ({
        id: row.id as number,
        name: row.name as string,
        target_count: (row.target_count as number) ?? 0,
        order_index: (row.order_index as number) ?? 0,
        topic_id: (row.topic_id as number | null) ?? null,
        // Deprecated paylaşımlı alanlar — UI progress tablosundan okur
        status: "calisilmadi",
        tracking_method: "soru_bazli",
        student_note: null,
        coach_note: null,
        last_studied_at: null,
        coach_priority: null,
      })) as ResourceTopicRow[];
      setResourceTopics(topicRows);
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
      setTaskRows([]);
      return;
    }

    setSelectedStudentId((prev) => {
      if (prev && assignedStudentIds.has(prev)) return prev;
      return assignedStudents[0].id;
    });
  }, [assignedStudents, assignedStudentIds, assignmentsLoading]);

  useEffect(() => {
    if (!selectedStudentId) {
      setTaskRows([]);
      setProgressByTopicId({});
      setExpandedTopicIds(new Set());
      return;
    }

    let cancelled = false;

    (async () => {
      setProgressLoading(true);
      setProgressError(null);
      setExpandedTopicIds(new Set());

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
        setTaskRows([]);
        setProgressLoading(false);
        return;
      }

      setTaskRows(tasksRes.data ?? []);
      setProgressLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, resource.id]);

  // Öğrenciye özel manuel takip (study_resource_topic_progress)
  const resourceTopicIdsKey = useMemo(
    () =>
      resourceTopics
        .map((t) => t.id)
        .sort((a, b) => a - b)
        .join(","),
    [resourceTopics]
  );

  useEffect(() => {
    if (!selectedStudentId || resourceTopics.length === 0) {
      setProgressByTopicId({});
      return;
    }

    let cancelled = false;
    const topicIds = resourceTopics.map((t) => t.id);

    (async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("study_resource_topic_progress")
        .select(
          "study_resource_topic_id, status, student_note, coach_note, coach_priority, last_studied_at"
        )
        .eq("student_id", selectedStudentId)
        .in("study_resource_topic_id", topicIds);

      if (cancelled) return;

      if (fetchError || !data) {
        setProgressByTopicId({});
        if (fetchError) {
          setTopicUpdateError(
            "Takip verisi yüklenemedi: " + fetchError.message
          );
        }
        return;
      }

      const next: Record<number, TopicStudentProgress> = {};
      for (const row of data) {
        const id = row.study_resource_topic_id as number;
        next[id] = {
          status: normalizeStatus(row.status as string | null),
          student_note: (row.student_note as string | null) ?? null,
          coach_note: (row.coach_note as string | null) ?? null,
          coach_priority: (row.coach_priority as string | null) ?? null,
          last_studied_at: (row.last_studied_at as string | null) ?? null,
        };
      }
      setProgressByTopicId(next);
      setTopicUpdateError(null);
    })();

    return () => {
      cancelled = true;
    };
    // resourceTopicIdsKey: id listesi stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, resourceTopicIdsKey]);

  // Secili ogrenci + bagli merkezi konular icin deneme matrisi
  const linkedCentralTopicIds = useMemo(() => {
    const ids = new Set<number>();
    for (const t of resourceTopics) {
      if (t.topic_id != null) ids.add(t.topic_id);
    }
    return [...ids].sort((a, b) => a - b);
  }, [resourceTopics]);

  const linkedCentralKey = linkedCentralTopicIds.join(",");

  useEffect(() => {
    if (!selectedStudentId || linkedCentralTopicIds.length === 0) {
      setRawTopicErrors([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("mock_exam_topic_errors")
        .select(
          `topic_id, wrong_count, correct_count, empty_count, not_in_exam,
           topic:topics(id, name, order_index),
           result:mock_exam_results!inner(
             id, subject_id, mock_exam_id,
             mock_exam:mock_exams!inner(id, exam_date, student_id, wrong_penalty_divisor)
           )`
        )
        .eq("result.mock_exam.student_id", selectedStudentId)
        .in("topic_id", linkedCentralTopicIds);

      if (cancelled) return;

      if (fetchError || !data) {
        setRawTopicErrors([]);
        return;
      }

      setRawTopicErrors(data as RawTopicErrorRecord[]);
    })();

    return () => {
      cancelled = true;
    };
    // linkedCentralKey: id listesi stabil string; linkedCentralTopicIds referansi degisse bile ayni icerikte tekrar fetch yok
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, linkedCentralKey]);

  const topicExamAnalysis = useMemo(() => {
    if (rawTopicErrors.length === 0) {
      return { examColumns: [] as ExamColumnDef[], rows: [] as TopicErrorAnalysisRow[], byTopicId: new Map<number, TopicErrorAnalysisRow>() };
    }
    const exams = examsFromRawErrors(rawTopicErrors);
    const analysis = buildTopicErrorAnalysis(rawTopicErrors, exams);
    const byTopicId = new Map(
      analysis.rows.map((r) => [r.topicId, r] as const)
    );
    return {
      examColumns: analysis.examColumns,
      rows: analysis.rows,
      byTopicId,
    };
  }, [rawTopicErrors]);

  // topics: resourceTopics + tasks + öğrenciye özel progress merge
  const topics = useMemo<TopicProgressRow[]>(() => {
    if (!selectedStudentId) return [];
    const base = buildTopicProgressRows(resourceTopics, taskRows);
    return base.map((t) => {
      if (t.id == null) return t;
      const p = progressByTopicId[t.id] ?? DEFAULT_TOPIC_PROGRESS;
      return {
        ...t,
        status: p.status,
        student_note: p.student_note,
        coach_note: p.coach_note,
        last_studied_at: p.last_studied_at,
        coach_priority: p.coach_priority,
      };
    });
  }, [selectedStudentId, resourceTopics, taskRows, progressByTopicId]);

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

  // Sadece yerel progress state (kontrollu input'lar icin, ornegin koc notu yazarken)
  function setProgressLocal(topicId: number, patch: TopicProgressPatch) {
    setProgressByTopicId((prev) => {
      const current = prev[topicId] ?? DEFAULT_TOPIC_PROGRESS;
      return {
        ...prev,
        [topicId]: {
          ...current,
          ...patch,
          status: patch.status != null ? normalizeStatus(patch.status) : current.status,
        },
      };
    });
  }

  // Merkezi müfredat bağlama — study_resource_topics.topic_id (paylaşımlı, doğru)
  async function updateTopicLink(topicId: number, patch: TopicLinkPatch) {
    const snapshot = resourceTopics;
    setTopicUpdateError(null);
    setResourceTopics((rows) =>
      rows.map((t) => (t.id === topicId ? { ...t, ...patch } : t))
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("study_resource_topics")
      .update(patch)
      .eq("id", topicId);

    if (updateError) {
      setResourceTopics(snapshot);
      setTopicUpdateError("Kaydedilemedi: " + updateError.message);
    }
  }

  // Öğrenciye özel takip — upsert study_resource_topic_progress
  async function upsertTopicProgress(
    topicId: number,
    patch: TopicProgressPatch
  ) {
    if (!selectedStudentId) return;

    const snapshot = progressByTopicId;
    const prev = progressByTopicId[topicId] ?? DEFAULT_TOPIC_PROGRESS;
    const next: TopicStudentProgress = {
      ...prev,
      ...patch,
      status: normalizeStatus(patch.status ?? prev.status),
    };

    setTopicUpdateError(null);
    setProgressByTopicId((m) => ({ ...m, [topicId]: next }));

    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from("study_resource_topic_progress")
      .upsert(
        {
          study_resource_topic_id: topicId,
          student_id: selectedStudentId,
          status: next.status,
          student_note: next.student_note,
          coach_note: next.coach_note,
          coach_priority: next.coach_priority,
          last_studied_at: next.last_studied_at,
        },
        { onConflict: "study_resource_topic_id,student_id" }
      );

    if (upsertError) {
      setProgressByTopicId(snapshot);
      setTopicUpdateError("Kaydedilemedi: " + upsertError.message);
    }
  }

  async function cycleTopicStatus(topicId: number) {
    const current =
      progressByTopicId[topicId]?.status ?? DEFAULT_TOPIC_PROGRESS.status;
    await upsertTopicProgress(topicId, {
      status: nextStatus(current),
      last_studied_at: new Date().toISOString(),
    });
  }

  function toggleTopicDetails(topicId: number) {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

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
              <div className="flex shrink-0 items-center gap-1">
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-lg border border-[var(--border)] bg-black/30 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:bg-red-500/40 hover:text-[var(--text-primary)]"
                    aria-label="Kaynağı sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[var(--border)] bg-black/30 p-2 text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:text-[var(--text-primary)]"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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

                          {topicUpdateError && (
                            <p className="mb-2 text-xs text-red-400">{topicUpdateError}</p>
                          )}

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
                        <div className="max-h-[420px] overflow-y-auto pr-1">
                          <div className="divide-y divide-[var(--border)]">
                            {topics.map((topic) => {
                              const status = normalizeStatus(topic.status);
                              const detailsOpen =
                                topic.id != null &&
                                expandedTopicIds.has(topic.id);

                              const centralTopic =
                                topic.topic_id != null
                                  ? curriculumTopics.find(
                                      (t) => t.id === topic.topic_id
                                    ) ?? null
                                  : null;
                              const indentCls =
                                centralTopic?.parent_id != null ? "pl-6" : "";

                              const riskRow =
                                topic.topic_id != null
                                  ? topicExamAnalysis.byTopicId.get(
                                      topic.topic_id
                                    ) ?? null
                                  : null;
                              const riskTitle =
                                topic.topic_id == null || !riskRow
                                  ? "Veri yok"
                                  : severityLabel(riskRow.severity);
                              const riskDotStyle = riskRow
                                ? {
                                    backgroundColor: topicSeverityColor(
                                      riskRow.severity
                                    ),
                                  }
                                : undefined;
                              return (
                                <div
                                  key={topic.id ?? "uncategorized"}
                                  className="py-2"
                                >
                                  <div className="flex items-center justify-between gap-3 px-1">
                                    <button
                                      type="button"
                                      disabled={topic.id == null}
                                      onClick={() => {
                                        if (topic.id == null) return;
                                        toggleTopicDetails(topic.id as number);
                                      }}
                                      className={`flex min-w-0 flex-1 items-center gap-2 text-left transition-colors ${
                                        topic.id == null
                                          ? "cursor-default"
                                          : "cursor-pointer hover:text-[var(--accent)]"
                                      }`}
                                    >
                                      <span className="shrink-0">
                                        {topic.id != null ? (
                                          detailsOpen ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                          )
                                        ) : null}
                                      </span>
                                      <span className={`min-w-0 truncate ${indentCls}`}>
                                        {topic.name}
                                      </span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                      {topic.id !== null && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void cycleTopicStatus(topic.id as number);
                                          }}
                                          aria-label={`Durum: ${statusLabel(status)}. Sonraki duruma geç`}
                                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 ${statusChipClass(status)}`}
                                        >
                                          <StatusIcon
                                            status={status}
                                            className="h-3 w-3"
                                          />
                                          {statusLabel(status)}
                                        </button>
                                      )}

                                      {topic.id !== null && topic.topic_id == null && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="shrink-0"
                                        >
                                          <CentralTopicLinkPicker
                                            linkedTopicId={topic.topic_id}
                                            curriculumTopics={curriculumTopics}
                                            disabled={subjectId == null}
                                            compact
                                            onLink={(centralTopicId) =>
                                              void updateTopicLink(
                                                topic.id as number,
                                                { topic_id: centralTopicId }
                                              )
                                            }
                                          />
                                        </div>
                                      )}

                                      <span
                                        className={`h-2.5 w-2.5 rounded-full ${
                                          riskRow ? "" : "bg-[var(--text-muted)]/50"
                                        }`}
                                        style={riskDotStyle}
                                        title={riskTitle}
                                      />
                                    </div>
                                  </div>

                                  {detailsOpen && topic.id != null && (
                                    <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-3">
                                      {topic.topic_id != null && (
                                        <TopicExamMatrixStrip
                                          row={
                                            topicExamAnalysis.byTopicId.get(
                                              topic.topic_id
                                            )
                                          }
                                          examColumns={
                                            topicExamAnalysis.examColumns
                                          }
                                        />
                                      )}

                                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                                        Son çalışma:{" "}
                                        <span className="font-medium text-[var(--text-secondary)]">
                                          {formatLastStudied(
                                            topic.last_studied_at
                                          )}
                                        </span>
                                      </p>

                                      <div className="mt-3 space-y-2.5">
                                        {topic.student_note ? (
                                          <p className="text-[11px] italic leading-relaxed text-[var(--text-secondary)]">
                                            Öğrenci: {topic.student_note}
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-[var(--text-muted)]">
                                            Öğrenci notu yok
                                          </p>
                                        )}

                                        <div className="flex flex-col gap-1">
                                          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                            Koç Notu
                                          </label>
                                          <textarea
                                            value={topic.coach_note ?? ""}
                                            onChange={(e) =>
                                              setProgressLocal(
                                                topic.id as number,
                                                {
                                                  coach_note:
                                                    e.target.value,
                                                }
                                              )
                                            }
                                            onBlur={(e) =>
                                              void upsertTopicProgress(
                                                topic.id as number,
                                                {
                                                  coach_note:
                                                    e.target.value.trim() ||
                                                    null,
                                                }
                                              )
                                            }
                                            rows={2}
                                            placeholder="Bu konuyla ilgili not ekle…"
                                            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[var(--text-primary)] placeholder-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                                          />
                                        </div>

                                        <label className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                                          <span className="font-semibold uppercase tracking-wider">
                                            Koç önceliği
                                          </span>
                                          <select
                                            value={normalizeCoachPriority(
                                              topic.coach_priority
                                            )}
                                            onChange={(e) =>
                                              void upsertTopicProgress(
                                                topic.id as number,
                                                {
                                                  coach_priority:
                                                    e.target.value === ""
                                                      ? null
                                                      : e.target.value,
                                                }
                                              )
                                            }
                                            aria-label="Koç önceliği"
                                            className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                                          >
                                            {COACH_PRIORITY_OPTIONS.map(
                                              (o) => (
                                                <option
                                                  key={o.label}
                                                  value={o.value}
                                                >
                                                  {o.label}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        </label>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
