"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "./SearchableSelect";
import type { ProgramSubject } from "./program-types";
import {
  BookOpen,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  ListTree,
  BookMarked,
  FileText,
  Save,
  Loader2,
  MessageSquare,
  Link2,
  Clock,
  Hash,
  CalendarDays,
} from "lucide-react";

export type TaskType =
  | "ders"
  | "deneme"
  | "bras_deneme"
  | "soru_cozumu"
  | "video_izleme"
  | "tekrar"
  | "yanlis_analizi"
  | "odev"
  | "manuel"
  | "kitap_okuma";

export type ExistingTask = {
  id: string;
  task_type: TaskType;
  subject_id: number | null;
  topic_id: number | null;
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  title: string;
  details: Record<string, string | number> | null;
};

type WizardStep =
  | "ders"
  | "ana_unite"
  | "alt_konu"
  | "gorev_turu"
  | "kaynak"
  | "detay"
  | "not";

const WIZARD_STEPS: WizardStep[] = [
  "ders",
  "ana_unite",
  "alt_konu",
  "gorev_turu",
  "kaynak",
  "detay",
  "not",
];

const STEP_LABELS: Record<WizardStep, string> = {
  ders: "Ders",
  ana_unite: "Ana Ünite",
  alt_konu: "Alt Konu",
  gorev_turu: "Görev Türü",
  kaynak: "Kaynak",
  detay: "Detay",
  not: "Not",
};

interface StudyResourceTopicOption {
  id: number;
  name: string;
  target_count: number;
  order_index: number;
}

interface StudyResourceOption {
  id: number;
  name: string;
  exam: { name: string } | null;
  subject: { name: string } | null;
  topics: StudyResourceTopicOption[];
}

function mapStudyResource(row: {
  id: number;
  name: string;
  exam: { name: string } | { name: string }[] | null;
  subject: { name: string } | { name: string }[] | null;
  topics: StudyResourceTopicOption[] | null;
}): StudyResourceOption {
  const examRaw = row.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topics = [...(row.topics ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );
  return {
    id: row.id,
    name: row.name,
    exam: exam as { name: string } | null,
    subject: subject as { name: string } | null,
    topics,
  };
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "ders", label: "Ders" },
  { value: "deneme", label: "Deneme" },
  { value: "soru_cozumu", label: "Soru Çözümü" },
  { value: "video_izleme", label: "Video İzleme" },
  { value: "tekrar", label: "Tekrar" },
  { value: "yanlis_analizi", label: "Yanlış Analizi" },
  { value: "odev", label: "Ödev" },
  { value: "manuel", label: "Manuel Görev" },
];

/** Düzenlemede listeden çıkarılmış türlerin etiketi (değer korunur). */
const LEGACY_TASK_TYPE_LABELS: Partial<Record<TaskType, string>> = {
  bras_deneme: "Branş Denemesi",
  kitap_okuma: "Kitap Okuma",
};

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0";

const labelCls =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]";

function buildSuggestedTitle(
  taskType: TaskType,
  subject: ProgramSubject | undefined,
  topicName: string | undefined
) {
  if (taskType === "deneme") return "Deneme";
  if (taskType === "bras_deneme") {
    return subject ? `${subject.name} Branş Denemesi` : "Branş Denemesi";
  }
  if (subject && topicName) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name} — ${topicName}`;
  }
  if (subject) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name}`;
  }
  return "Ders";
}

/** Dersin konularında parent_id dolu bir satır varsa hiyerarşi vardır. */
function subjectHasHierarchy(
  topics: { id: number; name: string; parent_id: number | null }[]
) {
  return topics.some((t) => t.parent_id !== null);
}

function pruneDetails(details: Record<string, string | number>) {
  return Object.fromEntries(
    Object.entries(details).filter(([, v]) => {
      if (v === "" || v === null || v === undefined) return false;
      if (typeof v === "number" && Number.isNaN(v)) return false;
      return true;
    })
  ) as Record<string, string | number>;
}

interface Props {
  onClose: () => void;
  studentId: string;
  subjects: ProgramSubject[];
  planDate: string;
  dayLabel: string;
  taskCountForDate: (date: string) => number;
  onSuccess: (planDate: string) => void;
  onError: (message: string) => void;
  existingTask?: ExistingTask | null;
  /** Haftanın günleri — yalnızca yeni görev eklerken çoklu gün seçimi için */
  weekDays?: Date[];
}

const DAY_LABELS_SHORT = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
] as const;

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDaySub(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function resolveAnaUniteId(
  subjects: ProgramSubject[],
  subjectId: number | null,
  topicId: number | null
): string {
  if (!subjectId || !topicId) return "";
  const subject = subjects.find((s) => s.id === subjectId);
  const topic = subject?.topics.find((t) => t.id === topicId);
  if (!topic) return "";
  // Alt konu ise ana ünite = parent; üst seviye yaprak konu ise ana ünite = kendisi.
  return String(topic.parent_id ?? topic.id);
}

export default function AddTaskModal({
  onClose,
  studentId,
  subjects,
  planDate,
  dayLabel,
  taskCountForDate,
  onSuccess,
  onError,
  existingTask = null,
  weekDays,
}: Props) {
  const supabase = createClient();
  const isEdit = Boolean(existingTask);

  const [step, setStep] = useState<WizardStep>("ders");
  const [taskType, setTaskType] = useState<TaskType>(
    existingTask?.task_type ?? "ders"
  );
  const [subjectId, setSubjectId] = useState(
    existingTask?.subject_id != null ? String(existingTask.subject_id) : ""
  );
  const [anaUniteId, setAnaUniteId] = useState(() =>
    resolveAnaUniteId(
      subjects,
      existingTask?.subject_id ?? null,
      existingTask?.topic_id ?? null
    )
  );
  const [topicId, setTopicId] = useState(
    existingTask?.topic_id != null ? String(existingTask.topic_id) : ""
  );
  const [title, setTitle] = useState(existingTask?.title ?? "Ders");
  const [titleEdited, setTitleEdited] = useState(Boolean(existingTask));
  const [resourceId, setResourceId] = useState(
    existingTask?.study_resource_id != null
      ? String(existingTask.study_resource_id)
      : ""
  );
  const [resourceTopicId, setResourceTopicId] = useState(
    existingTask?.study_resource_topic_id != null
      ? String(existingTask.study_resource_topic_id)
      : ""
  );
  const [resources, setResources] = useState<StudyResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, string | number>>(
    () => existingTask?.details ?? {}
  );
  const [additionalDays, setAdditionalDays] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];
  const hasHierarchy = useMemo(() => subjectHasHierarchy(topics), [topics]);

  const anaUniteler = useMemo(
    () => topics.filter((t) => t.parent_id === null),
    [topics]
  );

  // Bir konunun gerçekten ana ünite olması, ona parent_id ile bağlı çocuğu
  // olmasına bağlıdır — sadece parent_id === null olması yetmez (yaprak konular).
  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        topics
          .map((t) => t.parent_id)
          .filter((id): id is number => id !== null)
      ),
    [topics]
  );

  const selectedAnaUniteIsLeaf =
    Boolean(anaUniteId) && !parentIdsWithChildren.has(Number(anaUniteId));

  const altKonular = useMemo(() => {
    if (!hasHierarchy) return topics;
    if (!anaUniteId) return [];
    return topics.filter((t) => t.parent_id === Number(anaUniteId));
  }, [topics, hasHierarchy, anaUniteId]);

  const selectedResource = resources.find((r) => String(r.id) === resourceId);
  const resourceTopics = selectedResource?.topics ?? [];

  const visibleSteps = useMemo(
    () =>
      hasHierarchy
        ? WIZARD_STEPS
        : (WIZARD_STEPS.filter((s) => s !== "ana_unite") as WizardStep[]),
    [hasHierarchy]
  );

  const stepIndex = visibleSteps.indexOf(step);
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : 1;
  const totalSteps = visibleSteps.length;

  const setDetail = useCallback((key: string, value: string | number) => {
    setDetails((prev) => {
      const next = { ...prev };
      if (value === "" || (typeof value === "number" && Number.isNaN(value))) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (existingTask) {
      setStep("ders");
      setTaskType(existingTask.task_type);
      setSubjectId(
        existingTask.subject_id != null ? String(existingTask.subject_id) : ""
      );
      setAnaUniteId(
        resolveAnaUniteId(
          subjects,
          existingTask.subject_id,
          existingTask.topic_id
        )
      );
      setTopicId(
        existingTask.topic_id != null ? String(existingTask.topic_id) : ""
      );
      setTitle(existingTask.title);
      setTitleEdited(true);
      setResourceId(
        existingTask.study_resource_id != null
          ? String(existingTask.study_resource_id)
          : ""
      );
      setResourceTopicId(
        existingTask.study_resource_topic_id != null
          ? String(existingTask.study_resource_topic_id)
          : ""
      );
      setDetails(existingTask.details ?? {});
      setAdditionalDays(new Set());
      return;
    }

    setStep("ders");
    setTaskType("ders");
    setSubjectId("");
    setAnaUniteId("");
    setTopicId("");
    setTitle("Ders");
    setTitleEdited(false);
    setResourceId("");
    setResourceTopicId("");
    setDetails({});
    setAdditionalDays(new Set());
  }, [planDate, existingTask, subjects]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      setResourcesLoading(true);
      const { data } = await supabase
        .from("study_resources")
        .select(
          "id, name, exam:exams(name), subject:subjects(name), topics:study_resource_topics(id, name, target_count, order_index)"
        )
        .order("order_index");

      if (!cancelled) {
        setResources(
          (data ?? []).map((row) =>
            mapStudyResource(row as Parameters<typeof mapStudyResource>[0])
          )
        );
        setResourcesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, supabase]);

  useEffect(() => {
    if (titleEdited) return;
    const topicName = topics.find((t) => String(t.id) === topicId)?.name;
    setTitle(buildSuggestedTitle(taskType, selectedSubject, topicName));
  }, [taskType, subjectId, topicId, selectedSubject, topics, titleEdited]);

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

  const handleTaskTypeChange = useCallback((v: string) => {
    setTaskType(v as TaskType);
    // Tür değişince eski detay alanlarını temizle (edit dahil).
    setDetails({});
  }, []);

  const handleSubjectChange = useCallback((id: string) => {
    setSubjectId(id);
    setAnaUniteId("");
    setTopicId("");
  }, []);

  const handleAnaUniteChange = useCallback(
    (id: string) => {
      setAnaUniteId(id);
      // Yaprak konu (çocuğu yok) seçildiyse doğrudan final topic olur.
      if (id && !parentIdsWithChildren.has(Number(id))) {
        setTopicId(id);
      } else {
        setTopicId("");
      }
    },
    [parentIdsWithChildren]
  );

  const handleResourceChange = useCallback((id: string) => {
    setResourceId(id);
    setResourceTopicId("");
  }, []);

  const canGoNext = (() => {
    switch (step) {
      case "ders":
        return Boolean(subjectId);
      case "ana_unite":
        return Boolean(anaUniteId);
      case "alt_konu":
        return Boolean(topicId);
      case "gorev_turu":
        return Boolean(taskType);
      case "kaynak":
      case "detay":
        return true; // opsiyonel
      case "not":
        return true;
      default:
        return false;
    }
  })();

  const goNext = () => {
    if (!canGoNext) return;
    if (step === "ders") {
      setStep(hasHierarchy ? "ana_unite" : "alt_konu");
      return;
    }
    if (step === "ana_unite") {
      // Yaprak konu seçildiyse alt konu adımını atla.
      setStep(selectedAnaUniteIsLeaf ? "gorev_turu" : "alt_konu");
      return;
    }
    if (step === "alt_konu") {
      setStep("gorev_turu");
      return;
    }
    if (step === "gorev_turu") {
      setStep("kaynak");
      return;
    }
    if (step === "kaynak") {
      setStep("detay");
      return;
    }
    if (step === "detay") {
      setStep("not");
    }
  };

  const goBack = () => {
    if (step === "not") {
      setStep("detay");
      return;
    }
    if (step === "detay") {
      setStep("kaynak");
      return;
    }
    if (step === "kaynak") {
      setStep("gorev_turu");
      return;
    }
    if (step === "gorev_turu") {
      // Alt konu atlanmışsa (yaprak) doğrudan ana üniteye dön.
      if (hasHierarchy && selectedAnaUniteIsLeaf) {
        setStep("ana_unite");
      } else {
        setStep("alt_konu");
      }
      return;
    }
    if (step === "alt_konu") {
      setStep(hasHierarchy ? "ana_unite" : "ders");
      return;
    }
    if (step === "ana_unite") {
      setStep("ders");
    }
  };

  const handleSubmit = async () => {
    if (!planDate) {
      onError("Geçersiz gün.");
      return;
    }
    if (!title.trim()) {
      onError("Lütfen bir başlık girin.");
      return;
    }
    if (taskType !== "deneme" && !subjectId) {
      onError("Lütfen bir ders seçin.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
      setLoading(false);
      return;
    }

    // Genel Deneme derse bağlı değil — seçilmiş olsa bile null gönder.
    const isGeneralMock = taskType === "deneme";
    const cleanedDetails = pruneDetails(details);
    const subject_id = isGeneralMock
      ? null
      : subjectId
        ? parseInt(subjectId)
        : null;
    const topic_id = isGeneralMock
      ? null
      : topicId
        ? parseInt(topicId)
        : null;
    const study_resource_id = resourceId ? parseInt(resourceId, 10) : null;
    const study_resource_topic_id = resourceTopicId
      ? parseInt(resourceTopicId, 10)
      : null;

    if (existingTask) {
      const { error } = await supabase
        .from("study_plan_tasks")
        .update({
          subject_id,
          topic_id,
          task_type: taskType,
          title: title.trim(),
          study_resource_id,
          study_resource_topic_id,
          details: cleanedDetails,
        })
        .eq("id", existingTask.id);

      setLoading(false);

      if (error) {
        onError("Güncelleme sırasında hata oluştu: " + error.message);
        return;
      }

      onSuccess(planDate);
      onClose();
      return;
    }

    const insertTaskForDate = async (targetDate: string) => {
      const orderIndex = taskCountForDate(targetDate);
      const { error } = await supabase.from("study_plan_tasks").insert({
        student_id: studentId,
        teacher_id: user.id,
        plan_date: targetDate,
        subject_id,
        topic_id,
        task_type: taskType,
        title: title.trim(),
        start_time: null,
        end_time: null,
        break_minutes: null,
        order_index: orderIndex,
        is_completed: false,
        study_resource_id,
        study_resource_topic_id,
        details: cleanedDetails,
      });
      if (error) {
        throw { date: targetDate, message: error.message };
      }
      return targetDate;
    };

    const targetDates = Array.from(
      new Set([planDate, ...additionalDays])
    ).sort();

    const results = await Promise.allSettled(
      targetDates.map((d) => insertTaskForDate(d))
    );

    setLoading(false);

    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        succeeded.push(r.value);
      } else {
        const reason = r.reason as { date?: string; message?: string };
        failed.push(reason?.date ?? "?");
      }
    }

    for (const d of succeeded) {
      onSuccess(d);
    }

    if (failed.length === 0) {
      onClose();
      return;
    }

    if (succeeded.length === 0) {
      onError(
        `Kayıt sırasında hata oluştu (${failed.length} gün başarısız).`
      );
      return;
    }

    onError(
      `${succeeded.length} güne eklendi, ${failed.length} günde hata oluştu (${failed.join(", ")}).`
    );
    onClose();
  };

  if (!mounted) return null;

  const detailStr = (key: string) =>
    details[key] !== undefined && details[key] !== null
      ? String(details[key])
      : "";

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Paneli kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-modal-title"
        className="fixed inset-y-0 right-0 flex w-full max-w-md animate-in slide-in-from-right fill-mode-both flex-col border-l border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 duration-300"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2
              id="add-task-modal-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              {isEdit ? "Görevi Düzenle" : "Görev Ekle"} — {dayLabel}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Adım {stepNumber}/{totalSteps} · {STEP_LABELS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator — edit modunda adımlara tıklanabilir */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] px-5 py-3">
          {visibleSteps.map((s, i) => {
            const active = s === step;
            const done = stepIndex > i;
            const clickable = isEdit || done;
            return (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <button
                  type="button"
                  disabled={!clickable && !active}
                  onClick={() => {
                    if (clickable || active) setStep(s);
                  }}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--accent)]"
                      : done || isEdit
                        ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--accent)] hover:border-[var(--primary)]/60"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]"
                  } disabled:cursor-default`}
                  title={STEP_LABELS[s]}
                >
                  {i + 1}
                </button>
                {i < visibleSteps.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      done || isEdit
                        ? "bg-[var(--primary)]/40"
                        : "bg-[var(--border)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {step === "ders" && (
            <SearchableSelect
              label="Ders"
              icon={<BookOpen className="h-3.5 w-3.5" />}
              value={subjectId}
              onChange={handleSubjectChange}
              options={[
                { value: "", label: "— Ders seçin —" },
                ...subjects.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  group: s.exam ?? "Diğer",
                })),
              ]}
              placeholder="— Ders seçin —"
            />
          )}

          {step === "ana_unite" && (
            <SearchableSelect
              label="Ana Ünite"
              icon={<Layers className="h-3.5 w-3.5" />}
              value={anaUniteId}
              onChange={handleAnaUniteChange}
              options={[
                { value: "", label: "— Ana ünite seçin —" },
                ...anaUniteler.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  hint: parentIdsWithChildren.has(t.id)
                    ? "alt konular →"
                    : undefined,
                })),
              ]}
              placeholder="— Ana ünite seçin —"
              emptyText="Bu derste ana ünite yok"
            />
          )}

          {step === "alt_konu" && (
            <SearchableSelect
              label={hasHierarchy ? "Alt Konu" : "Konu"}
              icon={<ListTree className="h-3.5 w-3.5" />}
              value={topicId}
              onChange={setTopicId}
              options={[
                { value: "", label: "— Konu seçin —" },
                ...altKonular.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              disabled={altKonular.length === 0}
              placeholder="— Konu seçin —"
              emptyText={
                hasHierarchy
                  ? "Bu üniteye ait alt konu yok"
                  : "Bu derse ait konu yok"
              }
            />
          )}

          {step === "gorev_turu" && (
            <SearchableSelect
              label="Görev Türü"
              icon={<Tag className="h-3.5 w-3.5" />}
              value={taskType}
              onChange={handleTaskTypeChange}
              searchable={false}
              options={[
                ...TASK_TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })),
                ...(isEdit &&
                LEGACY_TASK_TYPE_LABELS[taskType] &&
                !TASK_TYPE_OPTIONS.some((o) => o.value === taskType)
                  ? [
                      {
                        value: taskType,
                        label: LEGACY_TASK_TYPE_LABELS[taskType] as string,
                      },
                    ]
                  : []),
              ]}
            />
          )}

          {step === "kaynak" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Kaynak (opsiyonel)
                </p>
                {resourcesLoading && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Kaynaklar yükleniyor…
                  </span>
                )}
              </div>

              <SearchableSelect
                label="Kaynak"
                icon={<BookMarked className="h-3.5 w-3.5" />}
                value={resourceId}
                onChange={handleResourceChange}
                disabled={resourcesLoading}
                options={[
                  { value: "", label: "— Kaynak seçin (opsiyonel) —" },
                  ...resources.map((r) => {
                    const hintParts: string[] = [];
                    if (r.exam?.name) hintParts.push(r.exam.name);
                    if (r.subject?.name) hintParts.push(r.subject.name);
                    return {
                      value: String(r.id),
                      label: r.name,
                      hint:
                        hintParts.length > 0
                          ? hintParts.join(" · ")
                          : undefined,
                    };
                  }),
                ]}
                placeholder="— Kaynak seçin (opsiyonel) —"
                emptyText="Henüz kaynak yok"
              />

              <SearchableSelect
                label="Kaynak Konusu"
                icon={<Tag className="h-3.5 w-3.5" />}
                value={resourceTopicId}
                onChange={setResourceTopicId}
                disabled={!resourceId || resourceTopics.length === 0}
                options={[
                  { value: "", label: "— Konu seçin —" },
                  ...resourceTopics.map((t) => ({
                    value: String(t.id),
                    label:
                      t.target_count > 0
                        ? `${t.name} (${t.target_count} soru)`
                        : t.name,
                  })),
                ]}
                placeholder="— Konu seçin —"
                emptyText="Bu kaynakta konu yok"
              />
            </div>
          )}

          {step === "detay" && (
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Detaylar (opsiyonel)
              </p>

              {taskType === "video_izleme" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Link2 className="h-3.5 w-3.5" />
                      Video Bağlantısı
                    </label>
                    <input
                      type="url"
                      value={detailStr("video_url")}
                      onChange={(e) => setDetail("video_url", e.target.value)}
                      placeholder="https://…"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Clock className="h-3.5 w-3.5" />
                      Video Süresi (dakika)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={detailStr("video_duration_minutes")}
                      onChange={(e) =>
                        setDetail(
                          "video_duration_minutes",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      placeholder="örn. 25"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {(taskType === "deneme" || taskType === "bras_deneme") && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <BookMarked className="h-3.5 w-3.5" />
                      Yayın
                    </label>
                    <input
                      type="text"
                      value={detailStr("mock_publisher")}
                      onChange={(e) =>
                        setDetail("mock_publisher", e.target.value)
                      }
                      placeholder="örn. 3D Yayınları"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <FileText className="h-3.5 w-3.5" />
                      Deneme Adı
                    </label>
                    <input
                      type="text"
                      value={detailStr("mock_name")}
                      onChange={(e) => setDetail("mock_name", e.target.value)}
                      placeholder="örn. TYT Genel Deneme 12"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Clock className="h-3.5 w-3.5" />
                      Tahmini Süre (dakika)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={detailStr("estimated_duration_minutes")}
                      onChange={(e) =>
                        setDetail(
                          "estimated_duration_minutes",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      placeholder="örn. 135"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {(taskType === "soru_cozumu" ||
                taskType === "tekrar" ||
                taskType === "yanlis_analizi" ||
                taskType === "odev") && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Hash className="h-3.5 w-3.5" />
                      Sayfa / Test Aralığı
                    </label>
                    <input
                      type="text"
                      value={detailStr("page_range")}
                      onChange={(e) => setDetail("page_range", e.target.value)}
                      placeholder='örn. "165-204"'
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Hash className="h-3.5 w-3.5" />
                      Soru Sayısı
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={detailStr("planned_question_count")}
                      onChange={(e) =>
                        setDetail(
                          "planned_question_count",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      placeholder="örn. 40"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>
                      <Clock className="h-3.5 w-3.5" />
                      Tahmini Süre (dakika)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={detailStr("estimated_duration_minutes")}
                      onChange={(e) =>
                        setDetail(
                          "estimated_duration_minutes",
                          e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                        )
                      }
                      placeholder="örn. 45"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {(taskType === "ders" ||
                taskType === "manuel" ||
                taskType === "kitap_okuma") && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>
                    <Clock className="h-3.5 w-3.5" />
                    Tahmini Süre (dakika)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={detailStr("estimated_duration_minutes")}
                    onChange={(e) =>
                      setDetail(
                        "estimated_duration_minutes",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="örn. 40"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          )}

          {step === "not" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Koç Notu
                </label>
                <textarea
                  value={detailStr("coach_note")}
                  onChange={(e) => setDetail("coach_note", e.target.value)}
                  rows={5}
                  placeholder="Öğrenciye özel not (opsiyonel)…"
                  className={`${inputCls} resize-none`}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Kaydettiğinizde görev öğrencinin programına eklenir.
                {title.trim() ? (
                  <>
                    {" "}
                    Başlık:{" "}
                    <span className="text-[var(--text-secondary)] font-medium">
                      {title.trim()}
                    </span>
                  </>
                ) : null}
              </p>

              {!isEdit && weekDays && weekDays.length > 0 && (
                <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Başka günlere de ekle
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Birincil gün ({dayLabel}) zaten seçili. İstersen aynı görevi
                    haftanın diğer günlerine de ekle.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {weekDays.map((d, i) => {
                      const dateStr = toISODateLocal(d);
                      const isPrimary = dateStr === planDate;
                      const checked =
                        isPrimary || additionalDays.has(dateStr);
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={isPrimary || loading}
                          onClick={() => {
                            if (isPrimary) return;
                            setAdditionalDays((prev) => {
                              const next = new Set(prev);
                              if (next.has(dateStr)) next.delete(dateStr);
                              else next.add(dateStr);
                              return next;
                            });
                          }}
                          className={`flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-default ${
                            checked
                              ? isPrimary
                                ? "border-[var(--primary)]/50 bg-[var(--primary)]/15 text-[var(--accent)]"
                                : "border-[var(--primary)]/40 bg-[var(--primary)]/20 text-[var(--text-primary)]"
                              : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--text-secondary)]"
                          }`}
                        >
                          <span className="text-xs font-bold">
                            {DAY_LABELS_SHORT[i]}
                            {isPrimary ? " · bu gün" : ""}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {formatDaySub(d)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex shrink-0 gap-3 border-t border-[var(--border)] px-5 py-4">
          {step !== "ders" ? (
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Geri
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
            >
              İptal
            </button>
          )}

          {step === "not" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:shadow-[var(--primary)]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading
                ? isEdit
                  ? "Güncelleniyor…"
                  : "Kaydediliyor…"
                : isEdit
                  ? "Güncelle"
                  : "Görevi Kaydet"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:shadow-[var(--primary)]/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              İleri
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
