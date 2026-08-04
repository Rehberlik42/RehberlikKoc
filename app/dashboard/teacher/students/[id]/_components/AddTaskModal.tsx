"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import {
  buildSuggestedTitle,
  buildTaskInsertPayload,
  type TaskType,
} from "@/lib/program/task-payload";
import { matchesTr } from "@/lib/program/tr-search";
import {
  focusNextField,
  isModKey,
  isOpenListboxContext,
  isTextareaTarget,
  isTypingTarget,
  modKeyLabel,
} from "@/lib/program/form-keyboard";
import SearchableSelect from "./SearchableSelect";
import TaskTypePicker from "./TaskTypePicker";
import type { ProgramSubject } from "./program-types";
import {
  BookOpen,
  Tag,
  X,
  BookMarked,
  FileText,
  Save,
  Loader2,
  MessageSquare,
  Link2,
  Clock,
  Hash,
  CalendarDays,
  Search,
  Plus,
} from "lucide-react";

export type { TaskType };

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

interface StudyResourceTopicOption {
  id: number;
  name: string;
  target_count: number;
  order_index: number;
  /** Merkezi topics.id — Faz B senkronu için dolu olmalı */
  topic_id: number | null;
}

interface StudyResourceOption {
  id: number;
  name: string;
  content_kind: string;
  exam: { name: string } | null;
  subject: { name: string } | null;
  topics: StudyResourceTopicOption[];
}

/** Konu takibi yapılabilen kaynak türleri (matris / progress ile uyumlu) */
const TRACKED_CONTENT_KINDS = new Set(["soru_bankasi", "konu_anlatimi"]);

/**
 * Bu görev türlerinde Kaynak listesi yalnızca soru bankası / konu anlatımı gösterir.
 * deneme, tekrar, manuel vb. tüm türlere açık kalır.
 */
const TOPIC_TRACKED_TASK_TYPES = new Set<TaskType>([
  "soru_cozumu",
  "yanlis_analizi",
]);

function taskTypeUsesTrackedResources(taskType: TaskType): boolean {
  return TOPIC_TRACKED_TASK_TYPES.has(taskType);
}

function mapExamSubject(row: {
  exam: { name: string } | { name: string }[] | null;
  subject: { name: string } | { name: string }[] | null;
}): {
  exam: { name: string } | null;
  subject: { name: string } | null;
} {
  const examRaw = row.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw)
    ? subjectRaw[0] ?? null
    : subjectRaw;
  return {
    exam: exam as { name: string } | null,
    subject: subject as { name: string } | null,
  };
}

/** subject_id → kaynak listesi (topics boş; konular ayrı cache'te) */
const resourceListCache = new Map<string, StudyResourceOption[]>();
/** study_resource.id → kaynak konuları */
const resourceTopicsCache = new Map<number, StudyResourceTopicOption[]>();

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0";

const labelCls =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]";

/** Dersin konularında parent_id dolu bir satır varsa hiyerarşi vardır. */
function subjectHasHierarchy(
  topics: { id: number; name: string; parent_id: number | null }[]
) {
  return topics.some((t) => t.parent_id !== null);
}

interface FlatTopicOption {
  /** subjectId:topicId */
  key: string;
  subjectId: number;
  topicId: number;
  anaUniteId: string;
  label: string;
}

function buildFlatTopicOptions(subjects: ProgramSubject[]): FlatTopicOption[] {
  const rows: FlatTopicOption[] = [];

  for (const subject of subjects) {
    const examPrefix = subject.exam ? `${subject.exam} ` : "";
    const dersLabel = `${examPrefix}${subject.name}`;
    const topics = subject.topics;
    const hasHierarchy = subjectHasHierarchy(topics);
    const parentIdsWithChildren = new Set(
      topics
        .map((t) => t.parent_id)
        .filter((id): id is number => id !== null)
    );

    if (hasHierarchy) {
      const anaUniteler = topics.filter((t) => t.parent_id === null);
      for (const ana of anaUniteler) {
        const children = topics.filter((t) => t.parent_id === ana.id);
        if (!parentIdsWithChildren.has(ana.id) || children.length === 0) {
          // Yaprak ana ünite — doğrudan seçilebilir
          rows.push({
            key: `${subject.id}:${ana.id}`,
            subjectId: subject.id,
            topicId: ana.id,
            anaUniteId: String(ana.id),
            label: `${dersLabel} · ${ana.name}`,
          });
        } else {
          for (const child of children) {
            rows.push({
              key: `${subject.id}:${child.id}`,
              subjectId: subject.id,
              topicId: child.id,
              anaUniteId: String(ana.id),
              label: `${dersLabel} · ${ana.name} · ${child.name}`,
            });
          }
        }
      }
    } else {
      for (const topic of topics) {
        rows.push({
          key: `${subject.id}:${topic.id}`,
          subjectId: subject.id,
          topicId: topic.id,
          anaUniteId: String(topic.id),
          label: `${dersLabel} · ${topic.name}`,
        });
      }
    }
  }

  return rows;
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
  draftMode?: boolean;
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
  draftMode = false,
}: Props) {
  const supabase = createClient();
  const isEdit = Boolean(existingTask);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const topicSearchRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<(andNew?: boolean) => Promise<void>>(
    async () => {}
  );
  const [modLabel] = useState(() => modKeyLabel());

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
  const [resourceTopicsLoading, setResourceTopicsLoading] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicHighlight, setTopicHighlight] = useState(0);
  const [showCoachNote, setShowCoachNote] = useState(() =>
    Boolean(existingTask?.details && "coach_note" in existingTask.details)
  );
  const [details, setDetails] = useState<Record<string, string | number>>(
    () => existingTask?.details ?? {}
  );
  const [additionalDays, setAdditionalDays] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];

  const flatTopicOptions = useMemo(
    () => buildFlatTopicOptions(subjects),
    [subjects]
  );

  const filteredTopicOptions = useMemo(() => {
    const q = topicQuery.trim();
    if (!q) return flatTopicOptions.slice(0, 40);
    return flatTopicOptions
      .filter((opt) => matchesTr(opt.label, q))
      .slice(0, 40);
  }, [flatTopicOptions, topicQuery]);

  useEffect(() => {
    setTopicHighlight(0);
  }, [topicQuery]);

  const selectedFlatTopic = useMemo(() => {
    if (!subjectId || !topicId) return null;
    return (
      flatTopicOptions.find(
        (o) =>
          String(o.subjectId) === subjectId && String(o.topicId) === topicId
      ) ?? null
    );
  }, [flatTopicOptions, subjectId, topicId]);

  const selectedResource = resources.find((r) => String(r.id) === resourceId);

  /** Görev türüne göre listelenecek kaynaklar */
  const selectableResources = useMemo(() => {
    const base = taskTypeUsesTrackedResources(taskType)
      ? resources.filter((r) => TRACKED_CONTENT_KINDS.has(r.content_kind))
      : resources;

    // Düzenlemede mevcut seçim filtreden düşmesin
    if (!resourceId) return base;
    if (base.some((r) => String(r.id) === resourceId)) return base;
    const current = resources.find((r) => String(r.id) === resourceId);
    return current ? [...base, current] : base;
  }, [resources, taskType, resourceId]);

  /** Merkezi topics'e bağlı kaynak konuları (topic_id dolu) */
  const linkedResourceTopics = useMemo(
    () => (selectedResource?.topics ?? []).filter((t) => t.topic_id != null),
    [selectedResource]
  );

  const resourceIsTopicBased = linkedResourceTopics.length > 0;

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

  const cacheKeyForSubject = (sid: string) => (sid ? sid : "__all__");

  const attachCachedTopics = useCallback(
    (list: StudyResourceOption[]) =>
      list.map((r) => ({
        ...r,
        topics: resourceTopicsCache.get(r.id) ?? r.topics,
      })),
    []
  );

  const loadResourceList = useCallback(async () => {
    const key = cacheKeyForSubject(subjectId);
    const cached = resourceListCache.get(key);
    if (cached) {
      setResources(attachCachedTopics(cached));
      return;
    }

    setResourcesLoading(true);
    let query = supabase
      .from("study_resources")
      .select(
        "id, name, content_kind, exam:exams(name), subject:subjects(name)"
      )
      .eq("is_active", true)
      .order("order_index");

    if (subjectId) {
      query = query.eq("subject_id", parseInt(subjectId, 10));
    }

    const { data } = await query;

    const mapped: StudyResourceOption[] = (data ?? []).map((row) => {
      const { exam, subject } = mapExamSubject(
        row as Parameters<typeof mapExamSubject>[0]
      );
      return {
        id: (row as { id: number }).id,
        name: (row as { name: string }).name,
        content_kind:
          (row as { content_kind?: string | null }).content_kind ??
          "soru_bankasi",
        exam,
        subject,
        topics: [],
      };
    });

    resourceListCache.set(key, mapped);
    setResources(attachCachedTopics(mapped));
    setResourcesLoading(false);
  }, [subjectId, supabase, attachCachedTopics]);

  const loadResourceTopics = useCallback(
    async (rid: number) => {
      const cached = resourceTopicsCache.get(rid);
      if (cached) {
        setResources((prev) =>
          prev.map((r) => (r.id === rid ? { ...r, topics: cached } : r))
        );
        return;
      }

      setResourceTopicsLoading(true);
      const { data } = await supabase
        .from("study_resource_topics")
        .select("id, name, target_count, order_index, topic_id")
        .eq("study_resource_id", rid)
        .order("order_index");

      const topicsMapped: StudyResourceTopicOption[] = [...(data ?? [])]
        .map((t) => ({
          id: t.id as number,
          name: t.name as string,
          target_count: (t.target_count as number) ?? 0,
          order_index: (t.order_index as number) ?? 0,
          topic_id: (t.topic_id as number | null) ?? null,
        }))
        .sort((a, b) => a.order_index - b.order_index);

      resourceTopicsCache.set(rid, topicsMapped);
      setResources((prev) =>
        prev.map((r) => (r.id === rid ? { ...r, topics: topicsMapped } : r))
      );
      setResourceTopicsLoading(false);
    },
    [supabase]
  );

  /** Edit'te seçili kaynak subject filtresine düşmezse tek satır olarak getir */
  const ensureResourceInList = useCallback(
    async (rid: number) => {
      let present = false;
      setResources((prev) => {
        present = prev.some((r) => r.id === rid);
        return prev;
      });
      if (present) return;

      const { data } = await supabase
        .from("study_resources")
        .select(
          "id, name, content_kind, exam:exams(name), subject:subjects(name)"
        )
        .eq("id", rid)
        .maybeSingle();

      if (!data) return;
      const { exam, subject } = mapExamSubject(
        data as Parameters<typeof mapExamSubject>[0]
      );
      const row: StudyResourceOption = {
        id: (data as { id: number }).id,
        name: (data as { name: string }).name,
        content_kind:
          (data as { content_kind?: string | null }).content_kind ??
          "soru_bankasi",
        exam,
        subject,
        topics: resourceTopicsCache.get(rid) ?? [],
      };
      setResources((prev) =>
        prev.some((r) => r.id === rid) ? prev : [...prev, row]
      );
    },
    [supabase]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    requestAnimationFrame(() => firstFocusRef.current?.focus());
  }, [mounted]);

  useEffect(() => {
    if (existingTask) {
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
      setShowCoachNote(
        Boolean(existingTask.details && "coach_note" in existingTask.details)
      );
      setAdditionalDays(new Set());
      setTopicQuery("");
      return;
    }

    setTaskType("ders");
    setSubjectId("");
    setAnaUniteId("");
    setTopicId("");
    setTitle("Ders");
    setTitleEdited(false);
    setResourceId("");
    setResourceTopicId("");
    setDetails({});
    setShowCoachNote(false);
    setAdditionalDays(new Set());
    setTopicQuery("");
  }, [planDate, existingTask, subjects]);

  // Edit modunda mevcut kaynak için liste + konuları yükle
  useEffect(() => {
    if (!mounted || !existingTask?.study_resource_id) return;
    const rid = existingTask.study_resource_id;
    void (async () => {
      await loadResourceList();
      await ensureResourceInList(rid);
      await loadResourceTopics(rid);
    })();
  }, [
    mounted,
    existingTask?.study_resource_id,
    loadResourceList,
    loadResourceTopics,
    ensureResourceInList,
  ]);

  // Kaynak seçilince konuları tembel yükle
  useEffect(() => {
    if (!resourceId) return;
    void loadResourceTopics(parseInt(resourceId, 10));
  }, [resourceId, loadResourceTopics]);

  // Subject değişince kaynak listesini cache'ten hazırla (konu cache'i birleştir)
  useEffect(() => {
    const key = cacheKeyForSubject(subjectId);
    const cached = resourceListCache.get(key);
    if (cached) {
      setResources(attachCachedTopics(cached));
    } else {
      setResources([]);
    }
  }, [subjectId, attachCachedTopics]);

  useEffect(() => {
    if (titleEdited) return;
    const topicName = topics.find((t) => String(t.id) === topicId)?.name;
    setTitle(buildSuggestedTitle(taskType, selectedSubject, topicName));
  }, [taskType, subjectId, topicId, selectedSubject, topics, titleEdited]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Enter" && isModKey(e)) {
        e.preventDefault();
        if (e.shiftKey || isEdit) {
          void handleSubmitRef.current(false);
        } else {
          void handleSubmitRef.current(true);
        }
        return;
      }

      if (e.key !== "Enter" || isModKey(e)) return;
      // textarea: satır atlama — alan değiştirme
      if (isTextareaTarget(e.target)) return;
      // Konu arama kendi onKeyDown'unda seçim yapar
      if (e.target === topicSearchRef.current) return;
      // SearchableSelect açık listbox
      if (isOpenListboxContext(e.target)) return;

      if (
        isTypingTarget(e.target) &&
        panelRef.current &&
        e.target instanceof HTMLElement
      ) {
        e.preventDefault();
        focusNextField(panelRef.current, e.target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, isEdit]);

  useEffect(() => {
    if (!addedFlash) return;
    const t = window.setTimeout(() => setAddedFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [addedFlash]);

  const handleTaskTypeChange = useCallback(
    (v: string) => {
      const next = v as TaskType;
      setTaskType(next);
      // Tür değişince eski detay alanlarını temizle (edit dahil).
      setDetails({});
      setShowCoachNote(false);
      // Konu-takip türüne geçildiyse uyumsuz kaynağı temizle
      setResourceId((prev) => {
        if (!prev || !taskTypeUsesTrackedResources(next)) return prev;
        const res = resources.find((r) => String(r.id) === prev);
        if (res && TRACKED_CONTENT_KINDS.has(res.content_kind)) return prev;
        setResourceTopicId("");
        return "";
      });
    },
    [resources]
  );

  const handleFlatTopicSelect = useCallback((opt: FlatTopicOption) => {
    setSubjectId(String(opt.subjectId));
    setAnaUniteId(opt.anaUniteId);
    setTopicId(String(opt.topicId));
    setTopicQuery("");
  }, []);

  const clearTopicSelection = useCallback(() => {
    setSubjectId("");
    setAnaUniteId("");
    setTopicId("");
    setTopicQuery("");
  }, []);

  const handleResourceChange = useCallback((id: string) => {
    setResourceId(id);
    setResourceTopicId("");
  }, []);

  // Konu bazlı olmayan kaynakta study_resource_topic_id taşınmasın
  useEffect(() => {
    if (resourceId && !resourceIsTopicBased && resourceTopicId) {
      setResourceTopicId("");
    }
  }, [resourceId, resourceIsTopicBased, resourceTopicId]);

  const dayCount = 1 + additionalDays.size;

  const resetForNew = useCallback(() => {
    // taskType, subjectId ve anaUniteId korunur (anaUniteId state'e dokunulmaz)
    setTopicId("");
    setResourceTopicId("");
    setDetails({});
    setShowCoachNote(false);
    setAdditionalDays(new Set());
    setTitleEdited(false);
    setTopicQuery("");
    const subj = subjects.find((s) => String(s.id) === subjectId);
    setTitle(buildSuggestedTitle(taskType, subj, undefined));
    setAddedFlash(true);
    requestAnimationFrame(() => topicSearchRef.current?.focus());
  }, [subjects, subjectId, taskType, anaUniteId]);

  const handleSubmit = async (andNew = false) => {
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

    const study_resource_id = resourceId ? parseInt(resourceId, 10) : null;
    // Yalnızca merkezi topics'e bağlı (topic_id dolu) satır kaydedilir
    const selectedSrt = linkedResourceTopics.find(
      (t) => String(t.id) === resourceTopicId
    );
    const study_resource_topic_id =
      selectedSrt && selectedSrt.topic_id != null ? selectedSrt.id : null;

    const subjectIdNum = subjectId ? parseInt(subjectId) : null;
    const topicIdNum = topicId ? parseInt(topicId) : null;

    if (existingTask) {
      const insertShape = buildTaskInsertPayload({
        studentId,
        teacherId: user.id,
        planDate,
        taskType,
        title: title.trim(),
        subjectId: subjectIdNum,
        topicId: topicIdNum,
        studyResourceId: study_resource_id,
        studyResourceTopicId: study_resource_topic_id,
        details,
        orderIndex: 0,
        draftMode,
      });
      const { error } = await supabase
        .from("study_plan_tasks")
        .update({
          subject_id: insertShape.subject_id,
          topic_id: insertShape.topic_id,
          task_type: insertShape.task_type,
          title: insertShape.title,
          study_resource_id: insertShape.study_resource_id,
          study_resource_topic_id: insertShape.study_resource_topic_id,
          details: insertShape.details,
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
      const { error } = await supabase.from("study_plan_tasks").insert(
        buildTaskInsertPayload({
          studentId,
          teacherId: user.id,
          planDate: targetDate,
          taskType,
          title: title.trim(),
          subjectId: subjectIdNum,
          topicId: topicIdNum,
          studyResourceId: study_resource_id,
          studyResourceTopicId: study_resource_topic_id,
          details,
          orderIndex,
          draftMode,
        })
      );
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
      if (andNew) {
        resetForNew();
        return;
      }
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
    if (andNew) {
      resetForNew();
      return;
    }
    onClose();
  };

  handleSubmitRef.current = handleSubmit;

  if (!mounted) return null;

  const detailStr = (key: string) =>
    details[key] !== undefined && details[key] !== null
      ? String(details[key])
      : "";

  const durationKey =
    taskType === "video_izleme"
      ? "video_duration_minutes"
      : "estimated_duration_minutes";

  const showSubjectTopic = taskType !== "deneme";

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="add-task-modal-title"
      className="fixed inset-0 z-50 flex flex-col bg-[var(--surface)] animate-in slide-in-from-right fill-mode-both duration-200 motion-reduce:animate-none lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[400px] lg:border-l lg:border-[var(--border)] lg:shadow-lg"
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
            {title.trim() || "Yeni görev"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {addedFlash && (
        <div className="shrink-0 border-b border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-center text-xs font-semibold text-emerald-300">
          Eklendi
        </div>
      )}

      {/* Single scrollable form */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* 3.1 Görev türü */}
        <section className="space-y-2.5">
          <p className={labelCls}>
            <Tag className="h-3.5 w-3.5" />
            Görev Türü
          </p>
          <TaskTypePicker
            value={taskType}
            onChange={handleTaskTypeChange}
            firstFocusRef={firstFocusRef}
            showLegacy={isEdit}
          />
        </section>

        {/* 3.2 Ders + konu */}
        {showSubjectTopic && (
          <section className="space-y-2.5">
            <p className={labelCls}>
              <BookOpen className="h-3.5 w-3.5" />
              Ders / Konu
            </p>

            {selectedFlatTopic ? (
              <div className="flex items-start gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 py-2.5">
                <span className="min-w-0 flex-1 text-sm font-medium text-[var(--text-primary)]">
                  {selectedFlatTopic.label}
                </span>
                <button
                  type="button"
                  onClick={clearTopicSelection}
                  className="shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors duration-150 hover:bg-white/10 hover:text-[var(--text-primary)]"
                  aria-label="Seçimi temizle"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    ref={topicSearchRef}
                    type="search"
                    value={topicQuery}
                    onChange={(e) => setTopicQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (filteredTopicOptions.length === 0) return;
                        setTopicHighlight((i) =>
                          Math.min(i + 1, filteredTopicOptions.length - 1)
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setTopicHighlight((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === "Enter" && !isModKey(e)) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (filteredTopicOptions.length > 0) {
                          const pick =
                            filteredTopicOptions[topicHighlight] ??
                            filteredTopicOptions[0];
                          handleFlatTopicSelect(pick);
                        }
                        requestAnimationFrame(() => {
                          if (
                            panelRef.current &&
                            topicSearchRef.current
                          ) {
                            focusNextField(
                              panelRef.current,
                              topicSearchRef.current
                            );
                          }
                        });
                      }
                    }}
                    placeholder="Ders veya konu ara…"
                    className={`${inputCls} pl-9`}
                    aria-autocomplete="list"
                    aria-expanded={filteredTopicOptions.length > 0}
                  />
                </div>
                <ul
                  role="listbox"
                  className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  {filteredTopicOptions.length === 0 ? (
                    <li className="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
                      Sonuç yok
                    </li>
                  ) : (
                    filteredTopicOptions.map((opt, i) => (
                      <li key={opt.key} role="option" aria-selected={i === topicHighlight}>
                        <button
                          type="button"
                          onClick={() => handleFlatTopicSelect(opt)}
                          onMouseEnter={() => setTopicHighlight(i)}
                          className={`w-full px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                            i === topicHighlight
                              ? "bg-[var(--primary)]/15 text-[var(--accent)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--primary)]/10 hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 3.3 Kaynak */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className={labelCls}>
              <BookMarked className="h-3.5 w-3.5" />
              Kaynak (opsiyonel)
            </p>
            {(resourcesLoading || resourceTopicsLoading) && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
            )}
          </div>

          {taskTypeUsesTrackedResources(taskType) ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Bu görev türünde yalnızca soru bankası / konu anlatımı kaynakları
              listelenir.
            </p>
          ) : null}

          <SearchableSelect
            label="Kaynak"
            icon={<BookMarked className="h-3.5 w-3.5" />}
            value={resourceId}
            onChange={handleResourceChange}
            onOpen={() => {
              void loadResourceList();
            }}
            options={[
              { value: "", label: "— Kaynak seçin (opsiyonel) —" },
              ...selectableResources.map((r) => {
                const hintParts: string[] = [];
                if (r.exam?.name) hintParts.push(r.exam.name);
                if (r.subject?.name) hintParts.push(r.subject.name);
                return {
                  value: String(r.id),
                  label: r.name,
                  hint:
                    hintParts.length > 0 ? hintParts.join(" · ") : undefined,
                };
              }),
            ]}
            placeholder="— Kaynak seçin (opsiyonel) —"
            emptyText={
              resourcesLoading
                ? "Kaynaklar yükleniyor…"
                : taskTypeUsesTrackedResources(taskType)
                  ? "Bu tür için uygun kaynak yok"
                  : "Henüz kaynak yok"
            }
          />

          {resourceId && resourceTopicsLoading ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Kaynak konuları yükleniyor…
            </p>
          ) : resourceId && !resourceIsTopicBased ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-3 text-xs text-[var(--text-muted)]">
              Bu kaynak konu bazlı değil.
            </p>
          ) : resourceId ? (
            <SearchableSelect
              label="Kaynak Konusu"
              icon={<Tag className="h-3.5 w-3.5" />}
              value={resourceTopicId}
              onChange={setResourceTopicId}
              disabled={linkedResourceTopics.length === 0}
              options={[
                { value: "", label: "— Konu seçin —" },
                ...linkedResourceTopics.map((t) => ({
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
          ) : null}
        </section>

        {/* 3.4 Detaylar */}
        <section className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Detaylar (opsiyonel)
          </p>

          {/* Süre — her türde */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              <Clock className="h-3.5 w-3.5" />
              Süre (dakika)
            </label>
            <input
              type="number"
              min={0}
              value={detailStr(durationKey)}
              onChange={(e) =>
                setDetail(
                  durationKey,
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              placeholder="örn. 40"
              className={inputCls}
            />
          </div>

          {taskType === "video_izleme" && (
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
                  onChange={(e) => setDetail("mock_publisher", e.target.value)}
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
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="örn. 40"
                  className={inputCls}
                />
              </div>
            </>
          )}

          {showCoachNote ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                <MessageSquare className="h-3.5 w-3.5" />
                Koç Notu
              </label>
              <textarea
                value={detailStr("coach_note")}
                onChange={(e) => setDetail("coach_note", e.target.value)}
                rows={4}
                placeholder="Öğrenciye özel not (opsiyonel)…"
                className={`${inputCls} resize-none`}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCoachNote(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            >
              <Plus className="h-3 w-3" />
              Koç notu
            </button>
          )}
        </section>

        {/* 3.5 Günler */}
        {!isEdit && weekDays && weekDays.length > 0 && (
          <section className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
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
                const checked = isPrimary || additionalDays.has(dateStr);
                return (
                  <label
                    key={dateStr}
                    className={`flex cursor-pointer flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors duration-150 focus-within:ring-2 focus-within:ring-[var(--primary)]/40 ${
                      checked
                        ? isPrimary
                          ? "border-[var(--primary)]/50 bg-[var(--primary)]/15 text-[var(--accent)]"
                          : "border-[var(--primary)]/40 bg-[var(--primary)]/20 text-[var(--text-primary)]"
                        : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--text-secondary)]"
                    } ${isPrimary || loading ? "cursor-default" : ""}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPrimary || loading}
                        onChange={() => {
                          if (isPrimary) return;
                          setAdditionalDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(dateStr)) next.delete(dateStr);
                            else next.add(dateStr);
                            return next;
                          });
                        }}
                        className="h-3 w-3 rounded border-[var(--border)] accent-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                      />
                      <span className="text-xs font-bold">
                        {DAY_LABELS_SHORT[i]}
                        {isPrimary ? " · bu gün" : ""}
                      </span>
                    </span>
                    <span className="mt-0.5 pl-4.5 text-[10px] opacity-80">
                      {formatDaySub(d)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--border)] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            {!isEdit && dayCount > 1
              ? `${dayCount} güne eklenecek`
              : !isEdit
                ? "1 güne eklenecek"
                : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          >
            İptal
          </button>

          {!isEdit && (
            <button
              type="button"
              onClick={() => void handleSubmit(true)}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--primary)]/30 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Kaydet ve yeni
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit(false)}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
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
                : "Kaydet"}
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--text-muted)]/70">
          {isEdit
            ? `${modLabel}+Enter kaydet · Esc kapat`
            : `Enter sonraki · ${modLabel}+Enter yeni · ${modLabel}+Shift+Enter kaydet · Esc kapat`}
        </p>
      </div>
    </div>,
    document.body
  );
}
