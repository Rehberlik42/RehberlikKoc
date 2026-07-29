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
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import type { StudentAssignedResource } from "./StudentResourcesClient";

interface Props {
  resource: StudentAssignedResource;
  studentId: string;
  onClose: () => void;
}

interface ResourceTopicRow {
  id: number;
  name: string;
  target_count: number;
  order_index: number;
  status: string;
  tracking_method: string;
  student_note: string | null;
  coach_note: string | null;
  last_studied_at: string | null;
  topic_id: number | null;
}

interface TopicProgressTotals {
  solved: number;
  correct: number;
  wrong: number;
}

interface TopicProgressRow {
  id: number | null;
  name: string;
  target_count: number;
  order_index: number;
  solved: number;
  correct: number;
  wrong: number;
  completionPct: number;
  net: number;
  status: string;
  tracking_method: string;
  student_note: string | null;
  coach_note: string | null;
  last_studied_at: string | null;
  topic_id: number | null;
}

interface CentralTopic {
  id: number;
  name: string;
  parent_id: number | null;
  order_index: number;
}

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
          compact
            ? "max-w-[2rem] justify-center p-1.5 gap-0"
            : "max-w-[11rem]"
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

function calcResourceNet(correct: number, wrong: number): number {
  return correct - wrong / 4;
}

function calcCompletionPct(solved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((solved / target) * 100));
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
      // Faz K2b: manuel takip alanlari (hesaplamayi degistirmez, sadece tasir)
      status: topic.status,
      tracking_method: topic.tracking_method,
      student_note: topic.student_note,
      coach_note: topic.coach_note,
      last_studied_at: topic.last_studied_at,
      topic_id: topic.topic_id ?? null,
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
      // DB kaydi olmayan sanal satir; duzenlenemez, mantikli varsayilanlar
      status: "calisilmadi",
      tracking_method: "soru_bazli",
      student_note: null,
      coach_note: null,
      last_studied_at: null,
      topic_id: null,
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

const TRACKING_OPTIONS = [
  { value: "sayfa_bazli", label: "Sayfa Bazlı" },
  { value: "test_bazli", label: "Test Bazlı" },
  { value: "soru_bazli", label: "Soru Bazlı" },
  { value: "konu_bazli", label: "Konu Bazlı" },
  { value: "karma", label: "Karma" },
] as const;

const TRACKING_VALUES = TRACKING_OPTIONS.map((o) => o.value) as readonly string[];

type ResourceStatus = (typeof STATUS_OPTIONS)[number]["value"];

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

function normalizeTracking(value: string | null | undefined): string {
  return value && TRACKING_VALUES.includes(value) ? value : "soru_bazli";
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
 * Kart içi mini konu×deneme şeridi — koç ResourceDetailModal ile aynı mantık
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

type TopicMetaPatch = {
  status?: string;
  tracking_method?: string;
  student_note?: string | null;
  last_studied_at?: string | null;
};

type TopicLinkPatch = {
  topic_id?: number | null;
};

export default function StudentResourceDetailModal({ resource, studentId, onClose }: Props) {
  const [resourceTopics, setResourceTopics] = useState<ResourceTopicRow[]>([]);
  const [taskRows, setTaskRows] = useState<
    {
      study_resource_topic_id: number | null;
      solved_count: number | null;
      correct_count: number | null;
      wrong_count: number | null;
    }[]
  >([]);
  const [rawTopicErrors, setRawTopicErrors] = useState<RawTopicErrorRecord[]>(
    []
  );
  const [topicUpdateError, setTopicUpdateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<number>>(
    () => new Set()
  );

  function toggleTopicDetails(topicId: number) {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  const [curriculumTopics, setCurriculumTopics] = useState<CentralTopic[]>([]);
  const [centralSubjectId, setCentralSubjectId] = useState<number | null>(null);

  useEffect(() => {
    if (!mounted) return;

    const subjectName = resource.subject?.name ?? null;
    if (!subjectName) {
      setCentralSubjectId(null);
      setCurriculumTopics([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", subjectName)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data?.id) {
        setCentralSubjectId(null);
        setCurriculumTopics([]);
        return;
      }
      setCentralSubjectId(data.id as number);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, resource.subject?.name]);

  useEffect(() => {
    if (!mounted) return;
    if (centralSubjectId == null) {
      setCurriculumTopics([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, parent_id, order_index")
        .eq("subject_id", centralSubjectId)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      if (error) {
        setCurriculumTopics([]);
        return;
      }
      setCurriculumTopics((data ?? []) as CentralTopic[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, centralSubjectId]);

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
          .select(
            "id, name, target_count, order_index, topic_id, status, tracking_method, student_note, coach_note, last_studied_at"
          )
          .eq("resource_id", resource.id)
          .order("order_index", { ascending: true }),
        supabase
          .from("study_plan_tasks")
          .select("study_resource_topic_id, solved_count, correct_count, wrong_count")
          .eq("study_resource_id", resource.id)
          .eq("student_id", studentId)
          .eq("is_published", true)
          .eq("is_completed", true)
          .not("solved_count", "is", null),
      ]);

      if (cancelled) return;

      if (topicsRes.error || tasksRes.error) {
        setError(
          topicsRes.error?.message ?? tasksRes.error?.message ?? "Veriler yüklenemedi"
        );
        setResourceTopics([]);
        setTaskRows([]);
        setLoading(false);
        return;
      }

      setResourceTopics((topicsRes.data ?? []) as ResourceTopicRow[]);
      setTaskRows(tasksRes.data ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, resource.id, studentId]);

  const linkedCentralTopicIds = useMemo(() => {
    const ids = new Set<number>();
    for (const t of resourceTopics) {
      if (t.topic_id != null) ids.add(t.topic_id);
    }
    return [...ids].sort((a, b) => a - b);
  }, [resourceTopics]);

  const linkedCentralKey = linkedCentralTopicIds.join(",");

  useEffect(() => {
    if (!studentId || linkedCentralTopicIds.length === 0) {
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
        .eq("result.mock_exam.student_id", studentId)
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
    // linkedCentralKey: id listesi stabil string
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, linkedCentralKey]);

  const topicExamAnalysis = useMemo(() => {
    if (rawTopicErrors.length === 0) {
      return {
        examColumns: [] as ExamColumnDef[],
        rows: [] as TopicErrorAnalysisRow[],
        byTopicId: new Map<number, TopicErrorAnalysisRow>(),
      };
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

  // topics: resourceTopics + tasks'tan turetiliyor. Manuel takip alanlari
  // resourceTopics'te tutuldugu icin bir alan degistiginde ekstra network
  // istegi atmadan liste aninda guncellenir (flicker onleme).
  const topics = useMemo<TopicProgressRow[]>(
    () => buildTopicProgressRows(resourceTopics, taskRows),
    [resourceTopics, taskRows]
  );

  // Optimistic guncelle + DB'ye yaz + hata olursa geri al
  async function updateTopicMeta(topicId: number, patch: TopicMetaPatch) {
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

  // Sadece yerel state'i gunceller (kontrollu ogrenci notu textarea'si icin)
  function setTopicMetaLocal(topicId: number, patch: TopicMetaPatch) {
    setResourceTopics((rows) =>
      rows.map((t) => (t.id === topicId ? { ...t, ...patch } : t))
    );
  }

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
          aria-labelledby="student-resource-detail-title"
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
                  id="student-resource-detail-title"
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
                {resource.note && (
                  <p className="mt-2 text-xs italic text-[var(--text-secondary)]">{resource.note}</p>
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
                <p className="mt-3 text-sm">İlerleme yükleniyor…</p>
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
                <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Genel İlerleme
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
                    <p className="text-lg font-bold text-[var(--accent)]">%{summary.completionPct}</p>
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

                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Konu Bazlı İlerleme
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
                  </div>
                  ) : (
                  <div className="max-h-[420px] overflow-y-auto pr-1 space-y-0">
                    {topics.map((topic) => {
                      const detailsOpen =
                        topic.id != null &&
                        expandedTopicIds.has(topic.id);

                      const status = normalizeStatus(topic.status);

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
                          ? topicExamAnalysis.byTopicId.get(topic.topic_id) ??
                            null
                          : null;
                      const riskTitle =
                        topic.topic_id == null || !riskRow
                          ? "Veri yok"
                          : severityLabel(riskRow.severity);
                      const riskDotStyle = riskRow
                        ? {
                            backgroundColor: topicSeverityColor(riskRow.severity),
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
                                    void updateTopicMeta(topic.id as number, {
                                      status: nextStatus(status),
                                      last_studied_at:
                                        new Date().toISOString(),
                                    });
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

                              {topic.id !== null &&
                                topic.topic_id == null && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0"
                                  >
                                    <CentralTopicLinkPicker
                                      linkedTopicId={topic.topic_id}
                                      curriculumTopics={curriculumTopics}
                                      disabled={centralSubjectId == null}
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
                            <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-3 space-y-2.5">
                              {topic.topic_id != null && (
                                <TopicExamMatrixStrip
                                  row={
                                    topicExamAnalysis.byTopicId.get(
                                      topic.topic_id
                                    )
                                  }
                                  examColumns={topicExamAnalysis.examColumns}
                                />
                              )}

                              <p className="text-[11px] text-[var(--text-muted)]">
                                Son çalışma:{" "}
                                <span className="font-medium text-[var(--text-secondary)]">
                                  {formatLastStudied(topic.last_studied_at)}
                                </span>
                              </p>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                  Öğrenci Notu
                                </label>
                                <textarea
                                  value={topic.student_note ?? ""}
                                  onChange={(e) =>
                                    setTopicMetaLocal(topic.id as number, {
                                      student_note: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    updateTopicMeta(topic.id as number, {
                                      student_note:
                                        e.target.value.trim() || null,
                                    })
                                  }
                                  rows={2}
                                  placeholder="Bu konuyla ilgili kendine not al…"
                                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[var(--text-primary)] placeholder-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                                />
                              </div>

                              {topic.coach_note ? (
                                <p className="text-[11px] italic leading-relaxed text-[var(--text-secondary)]">
                                  Koç: {topic.coach_note}
                                </p>
                              ) : (
                                <p className="text-[11px] text-[var(--text-muted)]">
                                  Koç notu yok
                                </p>
                              )}
                            </div>
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
