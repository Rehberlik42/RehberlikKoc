"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Grid3X3, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface ResourceMatrixSubject {
  id: number;
  name: string;
  exam_id: number | null;
  exam?: { name: string } | null;
}

interface SubjectGroup {
  id: number;
  group_name: string;
  order_index: number;
  tyt_subject_id: number | null;
  ayt_subject_id: number | null;
}

interface CurriculumTopic {
  id: number;
  name: string;
  parent_id: number | null;
  order_index: number;
}

interface TopicRow extends CurriculumTopic {
  depth: number;
}

interface MatrixResource {
  id: string;
  name: string;
  content_kind: string;
}

interface TopicProgress {
  status: string;
  student_note: string | null;
  coach_note: string | null;
  coach_priority: string | null;
  last_studied_at: string | null;
}

interface SubjectMatrixData {
  topicRows: TopicRow[];
  resources: MatrixResource[];
  otherResources: MatrixResource[];
  srtByCell: Map<string, number>;
  progressBySrtId: Map<number, TopicProgress>;
}

const TRACKED_CONTENT_KINDS = new Set(["soru_bankasi", "konu_anlatimi"]);
const OTHER_CONTENT_KINDS = new Set(["fasikul", "deneme", "paragraf", "diger"]);

const CONTENT_KIND_LABELS: Record<string, string> = {
  soru_bankasi: "Soru Bankası",
  konu_anlatimi: "Konu Anlatımı",
  fasikul: "Fasikül",
  deneme: "Deneme",
  paragraf: "Paragraf",
  diger: "Diğer",
};

const STATUS_OPTIONS = [
  { value: "calisilmadi", label: "Çalışılmadı" },
  { value: "baslandi", label: "Başlandı" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "tamamlandi", label: "Tamamlandı" },
  { value: "tekrar_gerekli", label: "Tekrar Gerekli" },
] as const;

const STATUS_CYCLE = STATUS_OPTIONS.map((o) => o.value);
const STATUS_VALUES = STATUS_OPTIONS.map((o) => o.value) as readonly string[];

const DEFAULT_PROGRESS: TopicProgress = {
  status: "calisilmadi",
  student_note: null,
  coach_note: null,
  coach_priority: null,
  last_studied_at: null,
};

const EMPTY_MATRIX: SubjectMatrixData = {
  topicRows: [],
  resources: [],
  otherResources: [],
  srtByCell: new Map(),
  progressBySrtId: new Map(),
};

function normalizeStatus(value: string | null | undefined): string {
  return value && STATUS_VALUES.includes(value) ? value : "calisilmadi";
}

function nextStatus(current: string): string {
  const idx = STATUS_CYCLE.indexOf(
    normalizeStatus(current) as (typeof STATUS_CYCLE)[number]
  );
  const i = idx >= 0 ? idx : 0;
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function statusLabel(value: string): string {
  return (
    STATUS_OPTIONS.find((o) => o.value === normalizeStatus(value))?.label ??
    "Çalışılmadı"
  );
}

function buildTopicRows(topics: CurriculumTopic[]): TopicRow[] {
  const byParent = new Map<number | null, CurriculumTopic[]>();
  for (const t of topics) {
    const key = t.parent_id;
    const arr = byParent.get(key) ?? [];
    arr.push(t);
    byParent.set(key, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.order_index - b.order_index);
  }

  const rows: TopicRow[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const t of byParent.get(parentId) ?? []) {
      rows.push({ ...t, depth });
      walk(t.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

function statusChipClass(status: string): string {
  switch (normalizeStatus(status)) {
    case "tamamlandi":
      return "border-emerald-500/55 bg-emerald-500/15 text-emerald-400";
    case "baslandi":
    case "devam_ediyor":
      return "border-amber-500/55 bg-amber-500/15 text-amber-400";
    case "tekrar_gerekli":
      return "border-rose-500/55 bg-rose-500/15 text-rose-400";
    default:
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]/40";
  }
}

function StatusIcon({
  status,
  className = "h-3.5 w-3.5",
}: {
  status: string;
  className?: string;
}) {
  switch (normalizeStatus(status)) {
    case "tamamlandi":
      return <Check className={className} strokeWidth={2.5} aria-hidden />;
    case "baslandi":
    case "devam_ediyor":
      return <Clock className={className} strokeWidth={2.5} aria-hidden />;
    case "tekrar_gerekli":
      return <RefreshCw className={className} strokeWidth={2.5} aria-hidden />;
    default:
      return null;
  }
}

function StatusChip({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const icon = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-full border ${statusChipClass(status)}`}
    >
      <StatusIcon status={status} className={icon} />
    </span>
  );
}

function cellKey(resourceId: string, topicId: number): string {
  return `${resourceId}:${topicId}`;
}

function parseAssignments(
  rows: {
    study_resource: unknown;
  }[]
): { tracked: MatrixResource[]; other: MatrixResource[] } {
  const tracked: MatrixResource[] = [];
  const other: MatrixResource[] = [];

  for (const row of rows) {
    const srRaw = row.study_resource;
    const sr = Array.isArray(srRaw) ? srRaw[0] : srRaw;
    if (!sr || typeof sr !== "object") continue;
    const kind =
      (sr as { content_kind?: string | null }).content_kind ?? "soru_bankasi";
    const entry: MatrixResource = {
      id: String((sr as { id: string | number }).id),
      name: (sr as { name: string }).name,
      content_kind: kind,
    };
    if (TRACKED_CONTENT_KINDS.has(kind)) {
      tracked.push(entry);
    } else if (OTHER_CONTENT_KINDS.has(kind)) {
      other.push(entry);
    }
  }

  tracked.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  other.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { tracked, other };
}

async function fetchSubjectMatrix(
  studentId: string,
  subjectId: number,
  resourceSubjectIds: number[] = [subjectId]
): Promise<SubjectMatrixData> {
  const supabase = createClient();
  const subjectIdsForResources =
    resourceSubjectIds.length > 0 ? resourceSubjectIds : [subjectId];

  const [topicsRes, assignmentsRes] = await Promise.all([
    supabase
      .from("topics")
      .select("id, name, parent_id, order_index")
      .eq("subject_id", subjectId)
      .order("order_index", { ascending: true }),
    supabase
      .from("resource_assignments")
      .select(
        "study_resource_id, study_resource:study_resources!inner(id, name, content_kind, subject_id, is_active)"
      )
      .eq("student_id", studentId)
      .in("study_resource.subject_id", subjectIdsForResources)
      .eq("study_resource.is_active", true),
  ]);

  if (topicsRes.error) throw topicsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const topicRows = buildTopicRows((topicsRes.data ?? []) as CurriculumTopic[]);
  const { tracked: resources, other: otherResources } = parseAssignments(
    assignmentsRes.data ?? []
  );

  if (resources.length === 0) {
    return {
      topicRows,
      resources,
      otherResources,
      srtByCell: new Map(),
      progressBySrtId: new Map(),
    };
  }

  const resourceIds = resources.map((r) => r.id);
  const { data: srtRows, error: srtError } = await supabase
    .from("study_resource_topics")
    .select("id, resource_id, topic_id")
    .in("resource_id", resourceIds)
    .not("topic_id", "is", null);

  if (srtError) throw srtError;

  const srtByCell = new Map<string, number>();
  const srtIds: number[] = [];
  for (const row of srtRows ?? []) {
    const topicId = row.topic_id as number | null;
    if (topicId == null) continue;
    const rid = String(row.resource_id);
    srtByCell.set(cellKey(rid, topicId), row.id as number);
    srtIds.push(row.id as number);
  }

  if (srtIds.length === 0) {
    return {
      topicRows,
      resources,
      otherResources,
      srtByCell,
      progressBySrtId: new Map(),
    };
  }

  const { data: progressRows, error: progressError } = await supabase
    .from("study_resource_topic_progress")
    .select(
      "study_resource_topic_id, status, student_note, coach_note, coach_priority, last_studied_at"
    )
    .eq("student_id", studentId)
    .in("study_resource_topic_id", srtIds);

  if (progressError) throw progressError;

  const progressBySrtId = new Map<number, TopicProgress>();
  for (const row of progressRows ?? []) {
    const id = row.study_resource_topic_id as number;
    progressBySrtId.set(id, {
      status: normalizeStatus(row.status as string | null),
      student_note: (row.student_note as string | null) ?? null,
      coach_note: (row.coach_note as string | null) ?? null,
      coach_priority: (row.coach_priority as string | null) ?? null,
      last_studied_at: (row.last_studied_at as string | null) ?? null,
    });
  }

  return {
    topicRows,
    resources,
    otherResources,
    srtByCell,
    progressBySrtId,
  };
}

function OtherResourcesSection({ items }: { items: MatrixResource[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Diğer Kaynaklar — konu bazlı değil
      </h3>
      <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]/40">
        {items.map((res) => (
          <li
            key={res.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <span className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">
              {res.name}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                {CONTENT_KIND_LABELS[res.content_kind] ?? res.content_kind}
              </span>
              <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                Atanmış
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3 text-[11px] text-[var(--text-muted)]">
      <span className="font-semibold text-[var(--text-secondary)]">Lejant:</span>
      <span className="inline-flex items-center gap-1.5">
        <StatusChip status="tamamlandi" size="sm" />
        Tamamlandı
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StatusChip status="devam_ediyor" size="sm" />
        Başlandı / Devam ediyor
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StatusChip status="tekrar_gerekli" size="sm" />
        Tekrar gerekli
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StatusChip status="calisilmadi" size="sm" />
        Çalışılmadı
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs">—</span>
        Bu kaynakta yok
      </span>
    </div>
  );
}

function SubjectMatrixPanel({
  studentId,
  subjectId,
  examLabel,
  subjectName,
  subjects,
}: {
  studentId: string;
  subjectId: number;
  examLabel: string;
  subjectName: string;
  subjects: ResourceMatrixSubject[];
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubjectMatrixData>(EMPTY_MATRIX);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [unassigned, setUnassigned] = useState<MatrixResource[]>([]);
  const addMenuRef = useRef<HTMLDivElement>(null);

  /** Aynı ders adı + aynı sınav (TYT/AYT) altındaki tüm subject_id'ler — kaynaklar bazen grup id'sinden farklı satıra bağlı olabiliyor */
  const assignableSubjectIds = useMemo(() => {
    const ids = new Set<number>([subjectId]);
    const examKey = examLabel.toUpperCase();
    for (const s of subjects) {
      if (s.name !== subjectName) continue;
      const examName = (s.exam?.name ?? "").toUpperCase();
      if (examName.includes(examKey)) ids.add(s.id);
    }
    return Array.from(ids);
  }, [subjectId, subjectName, examLabel, subjects]);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSubjectMatrix(
        studentId,
        subjectId,
        assignableSubjectIds
      );
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Matris yüklenemedi");
      setData(EMPTY_MATRIX);
    } finally {
      setLoading(false);
    }
  }, [studentId, subjectId, assignableSubjectIds]);

  useEffect(() => {
    void loadMatrix();
  }, [loadMatrix]);

  useEffect(() => {
    if (!addOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setAddOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addOpen]);

  const openAddMenu = async () => {
    if (addOpen) {
      setAddOpen(false);
      return;
    }

    setAddOpen(true);
    setAddLoading(true);
    setUnassigned([]);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Oturum bulunamadı");
      setAddLoading(false);
      return;
    }

    const [assignedRes, resourceRes] = await Promise.all([
      supabase
        .from("resource_assignments")
        .select("study_resource_id")
        .eq("student_id", studentId),
      // Kaynaklar sayfasıyla aynı kapsam: koçun aktif kaynakları + ders adı
      supabase
        .from("study_resources")
        .select(
          "id, name, content_kind, subject_id, subject:subjects(id, name, exam:exams(name))"
        )
        .eq("teacher_id", user.id)
        .eq("is_active", true)
        .order("name"),
    ]);

    setAddLoading(false);

    if (assignedRes.error) {
      setError("Kaynak listesi yüklenemedi: " + assignedRes.error.message);
      return;
    }
    if (resourceRes.error) {
      setError("Kaynak listesi yüklenemedi: " + resourceRes.error.message);
      return;
    }

    const assignedIds = new Set(
      (assignedRes.data ?? []).map((r) => String(r.study_resource_id))
    );

    const examKey = examLabel.toUpperCase();
    const nameKey = subjectName.trim().toLocaleLowerCase("tr");

    type Row = {
      id: string | number;
      name: string;
      content_kind: string | null;
      subject_id: number | null;
      subject:
        | { id: number; name: string; exam: { name: string } | { name: string }[] | null }
        | { id: number; name: string; exam: { name: string } | { name: string }[] | null }[]
        | null;
    };

    const rows = (resourceRes.data ?? []) as Row[];

    const matchesSubject = (row: Row): boolean => {
      // 1) subject_groups / panel subject_id veya aynı isim+sınav id'leri
      if (
        row.subject_id != null &&
        assignableSubjectIds.includes(row.subject_id)
      ) {
        return true;
      }
      // 2) Kaynaklar sayfası gibi: ders adına göre (büyük/küçük harf duyarsız)
      const sub = Array.isArray(row.subject) ? row.subject[0] : row.subject;
      if (!sub?.name) return false;
      if (sub.name.trim().toLocaleLowerCase("tr") !== nameKey) return false;
      const examRaw = sub.exam;
      const examName = (
        Array.isArray(examRaw) ? examRaw[0]?.name : examRaw?.name
      )?.toUpperCase();
      // Aynı sınav türü tercih; sınav bilgisi yoksa ada göre kabul et
      if (!examName) return true;
      return examName.includes(examKey);
    };

    const available = rows
      .filter(matchesSubject)
      .map((r) => ({
        id: String(r.id),
        name: r.name,
        content_kind: r.content_kind ?? "soru_bankasi",
      }))
      .filter(
        (r) =>
          TRACKED_CONTENT_KINDS.has(r.content_kind) && !assignedIds.has(r.id)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    setUnassigned(available);
  };

  const handleAssignResource = async (resourceId: string) => {
    setAssigningId(resourceId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Oturum bulunamadı");
      setAssigningId(null);
      return;
    }

    const { error: insertError } = await supabase
      .from("resource_assignments")
      .insert({
        study_resource_id: resourceId,
        student_id: studentId,
        assigned_by: user.id,
      });

    setAssigningId(null);

    if (insertError) {
      setError("Atama kaydedilemedi: " + insertError.message);
      return;
    }

    setAddOpen(false);
    await loadMatrix();
  };

  const handleCellClick = async (
    resourceId: string,
    topicId: number,
    srtId: number
  ) => {
    const key = cellKey(resourceId, topicId);
    if (savingKey) return;

    const snapshot = new Map(data.progressBySrtId);
    const prev = data.progressBySrtId.get(srtId) ?? DEFAULT_PROGRESS;
    const newStatus = nextStatus(prev.status);
    const next: TopicProgress = {
      ...prev,
      status: newStatus,
      last_studied_at: new Date().toISOString(),
    };

    setSavingKey(key);
    setData((d) => ({
      ...d,
      progressBySrtId: new Map(d.progressBySrtId).set(srtId, next),
    }));

    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from("study_resource_topic_progress")
      .upsert(
        {
          study_resource_topic_id: srtId,
          student_id: studentId,
          status: next.status,
          student_note: next.student_note,
          coach_note: next.coach_note,
          coach_priority: next.coach_priority,
          last_studied_at: next.last_studied_at,
        },
        { onConflict: "study_resource_topic_id,student_id" }
      );

    setSavingKey(null);

    if (upsertError) {
      setData((d) => ({ ...d, progressBySrtId: snapshot }));
      setError("Durum kaydedilemedi: " + upsertError.message);
    }
  };

  const { topicRows, resources, otherResources, srtByCell, progressBySrtId } =
    data;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {examLabel} · {subjectName}
        </h3>
        {/* + Kaynak Ekle — geçici olarak gizli
        <div className="relative shrink-0" ref={addMenuRef}>
          ...
        </div>
        */}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 py-12 text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <p className="mt-2 text-xs">Yükleniyor…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-4 text-center text-xs text-red-300">
          {error}
        </div>
      ) : topicRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-10 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Bu ders için merkezi kazanım tanımlanmamış.
          </p>
        </div>
      ) : (
        <>
          {resources.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Bu derse henüz kaynak atanmadı. Kaynaklar sayfasından atadığınızda
              burada sütun olarak görünecek.
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="sticky left-0 z-10 min-w-[8rem] bg-[var(--surface)] px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Kazanım
                  </th>
                  {resources.length === 0 ? (
                    <th className="min-w-[6rem] px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Kaynak
                    </th>
                  ) : null}
                  {resources.map((res) => (
                    <th
                      key={res.id}
                      className="min-w-[4.5rem] max-w-[7rem] px-1.5 py-2 text-center align-bottom"
                    >
                      <div className="mx-auto flex max-w-[6rem] flex-col items-center gap-1">
                        <span
                          className="line-clamp-2 text-[10px] font-semibold leading-tight text-[var(--text-primary)]"
                          title={res.name}
                        >
                          {res.name}
                        </span>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-1 py-0.5 text-[8px] font-semibold text-[var(--text-muted)]">
                          {CONTENT_KIND_LABELS[res.content_kind] ??
                            res.content_kind}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topicRows.map((topic, rowIndex) => (
                  <tr
                    key={topic.id}
                    className="border-b border-[var(--border)]/60 last:border-0"
                  >
                    <td
                      className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1.5"
                      style={{ paddingLeft: `${8 + topic.depth * 12}px` }}
                    >
                      <span
                        className={`text-[11px] ${
                          topic.depth === 0
                            ? "font-semibold text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {topic.name}
                      </span>
                    </td>
                    {resources.length === 0 ? (
                      rowIndex === 0 ? (
                        <td
                          rowSpan={topicRows.length}
                          className="px-2 py-1.5 text-center align-middle text-[11px] text-[var(--text-muted)]"
                        >
                          Henüz kaynak atanmadı
                        </td>
                      ) : null
                    ) : (
                      resources.map((res) => {
                        const key = cellKey(res.id, topic.id);
                        const srtId = srtByCell.get(key);
                        if (srtId == null) {
                          return (
                            <td
                              key={res.id}
                              className="px-1.5 py-1.5 text-center text-[var(--text-muted)]"
                            >
                              <span className="text-xs">—</span>
                            </td>
                          );
                        }

                        const progress =
                          progressBySrtId.get(srtId) ?? DEFAULT_PROGRESS;
                        const status = normalizeStatus(progress.status);
                        const isSaving = savingKey === key;

                        return (
                          <td key={res.id} className="px-1.5 py-1.5 text-center">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                void handleCellClick(res.id, topic.id, srtId)
                              }
                              title={`${statusLabel(status)} — tıklayarak değiştir`}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-transform hover:scale-105 disabled:opacity-50 ${statusChipClass(status)}`}
                              aria-label={`${topic.name} / ${res.name}: ${statusLabel(status)}`}
                            >
                              {isSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <StatusIcon status={status} />
                              )}
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resources.length > 0 ? <MatrixLegend /> : null}
        </>
      )}

      <OtherResourcesSection items={otherResources} />
    </div>
  );
}

interface Props {
  studentId: string;
  subjects: ResourceMatrixSubject[];
}

export default function ResourceMatrix({ studentId, subjects }: Props) {
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const subjectNameById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.name])),
    [subjects]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setGroupsLoading(true);
      setGroupsError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("subject_groups")
        .select("id, group_name, order_index, tyt_subject_id, ayt_subject_id")
        .order("order_index", { ascending: true });

      if (cancelled) return;
      setGroupsLoading(false);

      if (error) {
        setGroupsError("Ders grupları yüklenemedi: " + error.message);
        setGroups([]);
        return;
      }

      const rows = (data ?? []) as SubjectGroup[];
      setGroups(rows);
      if (rows.length > 0) {
        setSelectedGroupId((prev) => prev ?? rows[0].id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const hasTyt = selectedGroup?.tyt_subject_id != null;
  const hasAyt = selectedGroup?.ayt_subject_id != null;
  const dualColumn = hasTyt && hasAyt;

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
          <Grid3X3 className="h-3 w-3" />
          Kaynak Matrisi
        </div>
        <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
          Konu × Kaynak Takibi
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Ders grubu seçin; TYT ve AYT matrisleri yan yana görünür. Hücreye
          tıklayarak durumu güncelleyin.
        </p>
      </div>

      {groupsLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          Ders grupları yükleniyor…
        </div>
      ) : groupsError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-center text-sm text-red-300">
          {groupsError}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-14 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Henüz ders grubu tanımlanmamış.
          </p>
        </div>
      ) : (
        <>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div
              role="tablist"
              aria-label="Ders grupları"
              className="flex w-max min-w-full gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-1"
            >
              {groups.map((group) => {
                const active = group.id === selectedGroupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[var(--primary)]/20 text-[var(--accent)] shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {group.group_name}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGroup && (
            <div
              className={`grid gap-6 ${
                dualColumn ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {hasTyt && selectedGroup.tyt_subject_id != null && (
                <SubjectMatrixPanel
                  studentId={studentId}
                  subjectId={selectedGroup.tyt_subject_id}
                  examLabel="TYT"
                  subjectName={
                    subjectNameById.get(selectedGroup.tyt_subject_id) ??
                    selectedGroup.group_name
                  }
                  subjects={subjects}
                />
              )}
              {hasAyt && selectedGroup.ayt_subject_id != null && (
                <SubjectMatrixPanel
                  studentId={studentId}
                  subjectId={selectedGroup.ayt_subject_id}
                  examLabel="AYT"
                  subjectName={
                    subjectNameById.get(selectedGroup.ayt_subject_id) ??
                    selectedGroup.group_name
                  }
                  subjects={subjects}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
