"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid3X3, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HelpGuideButton from "@/components/ui/HelpGuideButton";
import {
  normalizeStatus,
  StatusChip,
  statusChipClass,
  StatusIcon,
} from "@/lib/resource-status-ui";

const RESOURCE_MATRIX_GUIDE = {
  title: "Kaynak Matrisi",
  sections: [
    {
      heading: "Nasıl çalışır",
      content: [
        "Üstteki şeritten bir ders grubu seçin. Grubun hem TYT hem AYT dersi varsa iki matris yan yana açılır (ör. TYT · Matematik ve AYT · Matematik).",
        "Her satır bir kazanım (konu), her sütun o derse atanmış bir kaynaktır. Hücreye tıklayınca durum sırayla değişir: Çalışılmadı → Başlandı → Devam Ediyor → Tamamlandı → Tekrar Gerekli → tekrar Çalışılmadı.",
        "Konu adına tıklayınca sağda Konu Detayı paneli açılır. Oradan aynı durumları seçebilir, Koç Notu yazabilir ve Son Çalışma tarihini görürsünüz.",
        "Hücrede — işareti, o kaynağın bu konuyla eşleşmediğini gösterir (Bu kaynakta yok).",
      ],
    },
    {
      heading: "Durum renkleri",
      content: [
        "Yeşil dolu: Tamamlandı",
        "Amber (yarı dolu): Başlandı / Devam Ediyor",
        "Kırmızı dolu: Tekrar Gerekli",
        "Boş çerçeve: Çalışılmadı",
      ],
    },
    {
      heading: "Filtreler",
      content: [
        "Sadece Eksikler: en az bir hücresi Tekrar Gerekli olan konular",
        "Devam Edenler: en az bir hücresi Başlandı veya Devam Ediyor olan konular",
        "Tamamlananlar: en az bir hücresi Tamamlandı olan konular",
        "Başlanmayanlar: en az bir hücresi Çalışılmadı olan konular",
        "Tümünü Göster: filtreyi kaldırır. Üstteki istatistik şeridi filtrelerden etkilenmez.",
      ],
    },
    {
      heading: "İpuçları",
      content:
        "Üstteki Genel İlerleme / Kaynak / Konu / Tamam / Devam / Tekrar / Boş sayaçları seçili ders grubundaki genel durumu özetler. Kaynak Bazında Tamamlanma çubuğu her kaynağın kendi ilerlemesini gösterir.",
    },
  ],
};

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

interface MatrixStats {
  resourceCount: number;
  topicCount: number;
  /** Konu×kaynak kombinasyonundan gerçekten var olan ("—" olmayan) hücre sayısı — yüzdelerin paydası */
  filledCells: number;
  completed: number;
  inProgress: number;
  needsReview: number;
  notStarted: number;
  progressPct: number;
  byResource: ResourceProgress[];
}

interface ResourceProgress {
  id: string;
  name: string;
  completed: number;
  /** Bu kaynağın sütununda gerçekten var olan hücre sayısı */
  filled: number;
  pct: number;
}

type StatusGroup =
  | "completed"
  | "in_progress"
  | "needs_review"
  | "not_started";

/**
 * Beş DB durumunu, D1 istatistiklerinin ve D5 filtrelerinin ortak kullandığı
 * dört kategoriye indirir — sayım ve filtreleme aynı kuralı paylaşsın diye
 * kategori mantığı yalnızca burada duruyor.
 */
function statusGroup(status: ResourceStatus): StatusGroup {
  if (status === "tamamlandi") return "completed";
  if (status === "baslandi" || status === "devam_ediyor") return "in_progress";
  if (status === "tekrar_gerekli") return "needs_review";
  return "not_started";
}

function computeMatrixStats({
  topicRows,
  resources,
  srtByCell,
  progressBySrtId,
}: SubjectMatrixData): MatrixStats {
  let filledCells = 0;
  let completed = 0;
  let inProgress = 0;
  let needsReview = 0;
  let notStarted = 0;
  const byResource: ResourceProgress[] = [];

  for (const res of resources) {
    let resFilled = 0;
    let resCompleted = 0;

    for (const topic of topicRows) {
      const srtId = srtByCell.get(cellKey(res.id, topic.id));
      if (srtId == null) continue;

      resFilled += 1;
      const status = normalizeStatus(
        (progressBySrtId.get(srtId) ?? DEFAULT_PROGRESS).status
      );
      switch (statusGroup(status)) {
        case "completed":
          resCompleted += 1;
          break;
        case "in_progress":
          inProgress += 1;
          break;
        case "needs_review":
          needsReview += 1;
          break;
        default:
          notStarted += 1;
      }
    }

    filledCells += resFilled;
    completed += resCompleted;
    byResource.push({
      id: res.id,
      name: res.name,
      completed: resCompleted,
      filled: resFilled,
      pct: resFilled === 0 ? 0 : Math.round((resCompleted / resFilled) * 100),
    });
  }

  return {
    resourceCount: resources.length,
    topicCount: topicRows.length,
    filledCells,
    completed,
    inProgress,
    needsReview,
    notStarted,
    progressPct:
      filledCells === 0 ? 0 : Math.round((completed / filledCells) * 100),
    byResource,
  };
}

function formatPct(count: number, total: number): string {
  return total === 0 ? "—" : `%${Math.round((count / total) * 100)}`;
}

const STAT_TONES = {
  neutral: "border-[var(--border)] bg-[var(--surface-2)]/60",
  /** Ölçek kutuları (Kaynak/Konu) — durum renklerinden ve birbirinden ayrışsın */
  sky: "border-sky-500/30 bg-sky-500/10",
  violet: "border-violet-500/30 bg-violet-500/10",
  emerald: "border-emerald-500/30 bg-emerald-500/10",
  amber: "border-amber-500/30 bg-amber-500/10",
  rose: "border-rose-500/30 bg-rose-500/10",
  muted: "border-[var(--border)] bg-[var(--surface-2)]/30",
} as const;

function StatBox({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${STAT_TONES[tone]}`}>
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-xl font-black leading-tight text-[var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ProgressDonut({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 100);
  const offset = circ * (1 - clamped / 100);

  return (
    <div className="relative mx-auto h-14 w-14">
      <svg
        viewBox="0 0 56 56"
        className="h-14 w-14 -rotate-90"
        role="img"
        aria-label={`Genel ilerleme %${clamped}`}
      >
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="6"
        />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-[var(--text-primary)]">
        %{clamped}
      </span>
    </div>
  );
}

function MatrixStatsStrip({ stats }: { stats: MatrixStats }) {
  const { filledCells } = stats;

  return (
    <div className="flex items-stretch gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-3">
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-3 py-2">
        <p className="max-w-[4.5rem] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-[var(--accent)]">
          Genel İlerleme
        </p>
        <ProgressDonut pct={stats.progressPct} />
      </div>
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-6">
        <StatBox label="Kaynak" value={stats.resourceCount} tone="sky" />
        <StatBox label="Konu" value={stats.topicCount} tone="violet" />
        <StatBox
          label="Tamam"
          value={stats.completed}
          hint={formatPct(stats.completed, filledCells)}
          tone="emerald"
        />
        <StatBox
          label="Devam"
          value={stats.inProgress}
          hint={formatPct(stats.inProgress, filledCells)}
          tone="amber"
        />
        <StatBox
          label="Tekrar"
          value={stats.needsReview}
          hint={formatPct(stats.needsReview, filledCells)}
          tone="rose"
        />
        <StatBox
          label="Boş"
          value={stats.notStarted}
          hint={formatPct(stats.notStarted, filledCells)}
          tone="muted"
        />
      </div>
    </div>
  );
}

function ResourceProgressBars({ items }: { items: ResourceProgress[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Kaynak Bazında Tamamlanma
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((res) => (
          <div
            key={res.id}
            className="min-w-[8.5rem] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-2.5 py-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="truncate text-[10px] font-semibold text-[var(--text-primary)]"
                title={res.name}
              >
                {res.name}
              </span>
              <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--accent)]">
                {res.filled === 0 ? "—" : `%${res.pct}`}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
              role="progressbar"
              aria-valuenow={res.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${res.name} tamamlanma oranı`}
            >
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${res.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] tabular-nums text-[var(--text-muted)]">
              {res.filled === 0
                ? "Kazanım eşleşmesi yok"
                : `${res.completed}/${res.filled} kazanım`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

type MatrixFilter = "all" | StatusGroup;

const FILTER_OPTIONS: {
  id: MatrixFilter;
  label: string;
  activeCls: string;
}[] = [
  {
    id: "needs_review",
    label: "Sadece Eksikler",
    activeCls: "border-rose-500/40 bg-rose-500/15 text-rose-600",
  },
  {
    id: "in_progress",
    label: "Devam Edenler",
    activeCls: "border-amber-500/40 bg-amber-500/15 text-amber-600",
  },
  {
    id: "completed",
    label: "Tamamlananlar",
    activeCls: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600",
  },
  {
    id: "not_started",
    label: "Başlanmayanlar",
    activeCls:
      "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
  },
  {
    id: "all",
    label: "Tümünü Göster",
    activeCls:
      "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--accent)]",
  },
];

function MatrixFilterBar({
  active,
  onChange,
}: {
  active: MatrixFilter;
  onChange: (filter: MatrixFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Filtre:
      </span>
      {FILTER_OPTIONS.map((opt) => {
        const isActive = opt.id === active;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.id)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
              isActive
                ? opt.activeCls
                : "border-[var(--border)] bg-[var(--surface-2)]/40 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatLastStudied(value: string | null | undefined): string {
  if (!value) return "Henüz kayıt yok";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Henüz kayıt yok";
  return parsed.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const DETAIL_LABEL_CLS =
  "text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]";

function TopicDetailPane({
  topic,
  resources,
  activeResource,
  progress,
  noteValue,
  saving,
  onSelectResource,
  onStatusSelect,
  onNoteChange,
  onNoteBlur,
}: {
  topic: TopicRow | null;
  resources: MatrixResource[];
  activeResource: MatrixResource | null;
  progress: TopicProgress | null;
  noteValue: string;
  saving: boolean;
  onSelectResource: (resourceId: string) => void;
  onStatusSelect: (status: ResourceStatus) => void;
  onNoteChange: (value: string) => void;
  onNoteBlur: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 p-3 2xl:sticky 2xl:top-4 2xl:w-72 2xl:shrink-0">
      <p className={DETAIL_LABEL_CLS}>Konu Detayı</p>

      {topic == null ? (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Detayları görmek için bir konuya tıklayın.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <h4 className="text-sm font-bold leading-snug text-[var(--text-primary)]">
            {topic.name}
          </h4>

          {resources.length === 0 || activeResource == null ? (
            <p className="text-xs text-[var(--text-muted)]">
              Bu konu, atanmış kaynakların hiçbirinde tanımlı değil.
            </p>
          ) : (
            <>
              {resources.length > 1 ? (
                <div className="space-y-1">
                  <p className={DETAIL_LABEL_CLS}>Kaynak</p>
                  <div className="flex flex-wrap gap-1">
                    {resources.map((res) => {
                      const active = res.id === activeResource.id;
                      return (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => onSelectResource(res.id)}
                          title={res.name}
                          aria-pressed={active}
                          className={`max-w-full truncate rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                            active
                              ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          }`}
                        >
                          {res.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p
                  className="truncate text-[11px] text-[var(--text-secondary)]"
                  title={activeResource.name}
                >
                  <span className="text-[var(--text-muted)]">Kaynak: </span>
                  {activeResource.name}
                </p>
              )}

              <div className="space-y-1.5">
                <p className={DETAIL_LABEL_CLS}>Durum</p>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const active =
                      normalizeStatus(progress?.status) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={saving}
                        aria-pressed={active}
                        onClick={() => onStatusSelect(opt.value)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                          active
                            ? `${statusChipClass(opt.value)} ring-2 ring-[var(--primary)]/30`
                            : "border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        }`}
                      >
                        <StatusIcon status={opt.value} className="h-3 w-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className={`block ${DETAIL_LABEL_CLS}`}>Koç Notu</span>
                <textarea
                  value={noteValue}
                  onChange={(e) => onNoteChange(e.target.value)}
                  onBlur={onNoteBlur}
                  rows={3}
                  placeholder="Bu konu için not ekle…"
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                />
              </label>

              <div className="space-y-0.5">
                <p className={DETAIL_LABEL_CLS}>Son Çalışma</p>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {formatLastStudied(progress?.last_studied_at)}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
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
  const [selection, setSelection] = useState<{
    topicId: number;
    resourceId: string | null;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState<{
    srtId: number;
    value: string;
  } | null>(null);
  const [activeFilter, setActiveFilter] = useState<MatrixFilter>("all");

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

  /**
   * Tek upsert yolu: hem hücre tıklaması hem sağdaki Konu Detayı bölmesi buradan
   * geçiyor, böylece iki taraf aynı state üzerinde anında tutarlı kalıyor.
   */
  const persistProgress = async (
    srtId: number,
    key: string,
    build: (prev: TopicProgress) => TopicProgress,
    failureMessage = "Durum kaydedilemedi"
  ) => {
    if (savingKey) return;

    const snapshot = new Map(data.progressBySrtId);
    const prev = data.progressBySrtId.get(srtId) ?? DEFAULT_PROGRESS;
    const next = build(prev);

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
      setError(`${failureMessage}: ${upsertError.message}`);
    }
  };

  const handleCellClick = (
    resourceId: string,
    topicId: number,
    srtId: number
  ) =>
    persistProgress(srtId, cellKey(resourceId, topicId), (prev) => ({
      ...prev,
      status: nextStatus(prev.status),
      last_studied_at: new Date().toISOString(),
    }));

  const { topicRows, resources, otherResources, srtByCell, progressBySrtId } =
    data;

  const stats = useMemo(() => computeMatrixStats(data), [data]);

  /** Konunun, verilen filtreye uyan en az bir dolu hücresi var mı */
  const topicMatchesFilter = useCallback(
    (topicId: number, filter: MatrixFilter) => {
      if (filter === "all") return true;
      return resources.some((res) => {
        const srtId = srtByCell.get(cellKey(res.id, topicId));
        if (srtId == null) return false;
        const status = normalizeStatus(
          (progressBySrtId.get(srtId) ?? DEFAULT_PROGRESS).status
        );
        return statusGroup(status) === filter;
      });
    },
    [resources, srtByCell, progressBySrtId]
  );

  /**
   * Yalnızca tabloda gösterilen satırları daraltır; D1/D2 hep panelin tamamını
   * yansıttığı için `stats` bilerek filtreden etkilenmiyor.
   */
  const visibleTopicRows = useMemo(() => {
    if (activeFilter === "all") return topicRows;
    return topicRows.filter((topic) =>
      topicMatchesFilter(topic.id, activeFilter)
    );
  }, [activeFilter, topicRows, topicMatchesFilter]);

  /** Yeni filtrede görünmeyecek bir konu seçiliyse D4 bölmesini boş duruma döndürür */
  const handleFilterChange = useCallback(
    (filter: MatrixFilter) => {
      setActiveFilter(filter);
      setSelection((prev) =>
        prev && !topicMatchesFilter(prev.topicId, filter) ? null : prev
      );
    },
    [topicMatchesFilter]
  );

  /** Seçili konu; resourceId null ise eşleşen ilk kaynak gösterilir */
  const selectedTopicId = selection?.topicId ?? null;

  const selectedTopic = useMemo(
    () => topicRows.find((t) => t.id === selectedTopicId) ?? null,
    [topicRows, selectedTopicId]
  );

  /** Seçili konunun gerçekten bulunduğu kaynaklar ("—" olmayan sütunlar) */
  const selectedTopicResources = useMemo(() => {
    if (selectedTopicId == null) return [];
    return resources.filter((r) =>
      srtByCell.has(cellKey(r.id, selectedTopicId))
    );
  }, [resources, srtByCell, selectedTopicId]);

  const activeResource =
    selectedTopicResources.find((r) => r.id === selection?.resourceId) ??
    selectedTopicResources[0] ??
    null;

  const activeSrtId =
    selectedTopicId != null && activeResource
      ? srtByCell.get(cellKey(activeResource.id, selectedTopicId)) ?? null
      : null;

  const activeProgress =
    activeSrtId != null
      ? progressBySrtId.get(activeSrtId) ?? DEFAULT_PROGRESS
      : null;

  /**
   * Not taslağı hedefiyle birlikte tutuluyor; böylece seçim değişince effect
   * içinde setState yapmadan otomatik olarak kayıtlı değere dönüyor.
   */
  const noteValue =
    noteDraft && noteDraft.srtId === activeSrtId
      ? noteDraft.value
      : activeProgress?.coach_note ?? "";

  const handleNoteBlur = () => {
    if (activeSrtId == null || !noteDraft || noteDraft.srtId !== activeSrtId) {
      return;
    }

    const trimmed = noteDraft.value.trim();
    const current = progressBySrtId.get(activeSrtId) ?? DEFAULT_PROGRESS;
    if ((current.coach_note ?? "") === trimmed) return;

    void persistProgress(
      activeSrtId,
      `note:${activeSrtId}`,
      (prev) => ({ ...prev, coach_note: trimmed === "" ? null : trimmed }),
      "Not kaydedilemedi"
    );
  };

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
          <MatrixStatsStrip stats={stats} />
          <ResourceProgressBars items={stats.byResource} />
          {resources.length > 0 ? (
            <MatrixFilterBar
              active={activeFilter}
              onChange={handleFilterChange}
            />
          ) : null}
          {resources.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Bu derse henüz kaynak atanmadı. Kaynaklar sayfasından atadığınızda
              burada sütun olarak görünecek.
            </p>
          ) : null}
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start">
            <div className="min-w-0 flex-1 space-y-3">
              {visibleTopicRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-10 text-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    Bu filtreye uyan konu yok.
                  </p>
                </div>
              ) : (
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
                      {visibleTopicRows.map((topic, rowIndex) => {
                        const isSelectedRow = topic.id === selectedTopicId;

                        return (
                          <tr
                            key={topic.id}
                            className="border-b border-[var(--border)]/60 last:border-0"
                          >
                            <td
                              className={`sticky left-0 z-10 px-2 py-1.5 ${
                                isSelectedRow
                                  ? "bg-[var(--primary)]/10"
                                  : "bg-[var(--surface)]"
                              }`}
                              style={{
                                paddingLeft: `${8 + topic.depth * 12}px`,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSelection({
                                    topicId: topic.id,
                                    resourceId: null,
                                  })
                                }
                                title="Konu detayını aç"
                                className={`w-full truncate text-left text-[11px] transition-colors hover:text-[var(--accent)] ${
                                  topic.depth === 0
                                    ? "font-semibold text-[var(--text-primary)]"
                                    : "text-[var(--text-secondary)]"
                                } ${isSelectedRow ? "text-[var(--accent)]" : ""}`}
                              >
                                {topic.name}
                              </button>
                            </td>
                            {resources.length === 0 ? (
                              rowIndex === 0 ? (
                                <td
                                  rowSpan={visibleTopicRows.length}
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
                                  progressBySrtId.get(srtId) ??
                                  DEFAULT_PROGRESS;
                                const status = normalizeStatus(progress.status);
                                const isSaving = savingKey === key;

                                return (
                                  <td
                                    key={res.id}
                                    className="px-1.5 py-1.5 text-center"
                                  >
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() =>
                                        void handleCellClick(
                                          res.id,
                                          topic.id,
                                          srtId
                                        )
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {resources.length > 0 ? <MatrixLegend /> : null}
            </div>
            {resources.length > 0 ? (
              <TopicDetailPane
                topic={selectedTopic}
                resources={selectedTopicResources}
                activeResource={activeResource}
                progress={activeProgress}
                noteValue={noteValue}
                saving={savingKey !== null}
                onSelectResource={(resourceId) =>
                  setSelection((prev) =>
                    prev ? { ...prev, resourceId } : prev
                  )
                }
                onStatusSelect={(status) => {
                  if (
                    activeSrtId == null ||
                    activeResource == null ||
                    selectedTopicId == null
                  ) {
                    return;
                  }
                  void persistProgress(
                    activeSrtId,
                    cellKey(activeResource.id, selectedTopicId),
                    (prev) => ({
                      ...prev,
                      status,
                      last_studied_at: new Date().toISOString(),
                    })
                  );
                }}
                onNoteChange={(value) => {
                  if (activeSrtId == null) return;
                  setNoteDraft({ srtId: activeSrtId, value });
                }}
                onNoteBlur={handleNoteBlur}
              />
            ) : null}
          </div>
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
        <div className="mt-2 flex items-center gap-2">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Konu × Kaynak Takibi
          </h2>
          <HelpGuideButton
            title={RESOURCE_MATRIX_GUIDE.title}
            sections={RESOURCE_MATRIX_GUIDE.sections}
          />
        </div>
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
