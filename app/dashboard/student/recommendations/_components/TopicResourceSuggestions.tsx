import { BookMarked, Sparkles } from "lucide-react";
import {
  normalizeStatus,
  StatusChip,
  type ResourceStatus,
} from "@/lib/resource-status-ui";
import {
  buildTopicErrorAnalysis,
  type NormalizedExam,
  type RawTopicErrorRecord,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

const SUPPORTED_CONTENT_KINDS = new Set(["soru_bankasi", "konu_anlatimi"]);

export interface AssignedResourceRecord {
  study_resource:
    | {
        id: string | number;
        name: string;
        content_kind: string | null;
        topics:
          | {
              id: number;
              topic_id: number | null;
            }[]
          | null;
      }
    | {
        id: string | number;
        name: string;
        content_kind: string | null;
        topics:
          | {
              id: number;
              topic_id: number | null;
            }[]
          | null;
      }[]
    | null;
}

export interface AssignedTopicProgressRecord {
  study_resource_topic_id: number;
  status: string | null;
}

interface WeakTopic {
  id: number;
  name: string;
  avgWrong: number;
}

interface SuggestedAssignedResource {
  resourceTopicId: number;
  resourceId: string;
  name: string;
  contentKind: string;
  status: ResourceStatus | null;
}

export interface TopicResourceSuggestion {
  topic: WeakTopic;
  resources: SuggestedAssignedResource[];
}

function resultSubjectId(row: RawTopicErrorRecord): number | null {
  const result = Array.isArray(row.result) ? row.result[0] : row.result;
  return result?.subject_id ?? null;
}

export function findStudentWeakTopics(
  rawErrors: RawTopicErrorRecord[],
  recentExams: NormalizedExam[]
): WeakTopic[] {
  if (recentExams.length === 0) return [];

  const errorsBySubject = new Map<number, RawTopicErrorRecord[]>();
  for (const row of rawErrors) {
    const subjectId = resultSubjectId(row);
    if (subjectId == null) continue;
    const rows = errorsBySubject.get(subjectId) ?? [];
    rows.push(row);
    errorsBySubject.set(subjectId, rows);
  }

  const weakByTopic = new Map<number, WeakTopic>();
  for (const rows of errorsBySubject.values()) {
    const analysis = buildTopicErrorAnalysis(rows, recentExams);
    for (const topic of analysis.rows) {
      if (topic.severity !== "bad") continue;
      const current = weakByTopic.get(topic.topicId);
      if (!current || topic.avgWrong > current.avgWrong) {
        weakByTopic.set(topic.topicId, {
          id: topic.topicId,
          name: topic.topicName,
          avgWrong: topic.avgWrong,
        });
      }
    }
  }

  return [...weakByTopic.values()].sort(
    (a, b) =>
      b.avgWrong - a.avgWrong || a.name.localeCompare(b.name, "tr-TR")
  );
}

export function assignedResourceTopicIds(
  assignments: AssignedResourceRecord[]
): number[] {
  const ids: number[] = [];
  for (const assignment of assignments) {
    const resource = Array.isArray(assignment.study_resource)
      ? assignment.study_resource[0] ?? null
      : assignment.study_resource;
    if (
      !resource ||
      !SUPPORTED_CONTENT_KINDS.has(resource.content_kind ?? "")
    ) {
      continue;
    }
    for (const topic of resource.topics ?? []) ids.push(topic.id);
  }
  return [...new Set(ids)];
}

export function buildStudentTopicResourceSuggestions(
  weakTopics: WeakTopic[],
  assignments: AssignedResourceRecord[],
  progressRows: AssignedTopicProgressRecord[]
): TopicResourceSuggestion[] {
  const weakById = new Map(weakTopics.map((topic) => [topic.id, topic]));
  const progressByResourceTopic = new Map(
    progressRows.map((row) => [
      row.study_resource_topic_id,
      normalizeStatus(row.status),
    ])
  );
  const resourcesByTopic = new Map<
    number,
    Map<string, SuggestedAssignedResource>
  >();

  for (const assignment of assignments) {
    const resource = Array.isArray(assignment.study_resource)
      ? assignment.study_resource[0] ?? null
      : assignment.study_resource;
    if (
      !resource ||
      !SUPPORTED_CONTENT_KINDS.has(resource.content_kind ?? "")
    ) {
      continue;
    }

    for (const resourceTopic of resource.topics ?? []) {
      const topicId = resourceTopic.topic_id;
      if (topicId == null || !weakById.has(topicId)) continue;

      const status =
        progressByResourceTopic.get(resourceTopic.id) ?? null;
      if (status === "tamamlandi") continue;

      const resources =
        resourcesByTopic.get(topicId) ??
        new Map<string, SuggestedAssignedResource>();
      const resourceId = String(resource.id);
      resources.set(resourceId, {
        resourceTopicId: resourceTopic.id,
        resourceId,
        name: resource.name,
        contentKind: resource.content_kind ?? "soru_bankasi",
        status,
      });
      resourcesByTopic.set(topicId, resources);
    }
  }

  return weakTopics
    .map((topic) => ({
      topic,
      resources: [...(resourcesByTopic.get(topic.id)?.values() ?? [])].sort(
        (a, b) => a.name.localeCompare(b.name, "tr-TR")
      ),
    }))
    .filter((suggestion) => suggestion.resources.length > 0);
}

function statusLabel(status: ResourceStatus): string {
  switch (status) {
    case "baslandi":
      return "Başlandı";
    case "devam_ediyor":
      return "Devam ediyor";
    case "tekrar_gerekli":
      return "Tekrar gerekli";
    case "tamamlandi":
      return "Tamamlandı";
    default:
      return "Başlanmadı";
  }
}

function contentKindLabel(kind: string): string {
  return kind === "konu_anlatimi" ? "Konu anlatımı" : "Soru bankası";
}

export default function TopicResourceSuggestions({
  suggestions,
}: {
  suggestions: TopicResourceSuggestion[];
}) {
  if (suggestions.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-[var(--surface)]/50 backdrop-blur-md">
      <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
          <Sparkles className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Kaynaklarımdan Öneriler
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Son denemelerindeki zayıf konularına göre, atanmış ve henüz
            tamamlanmamış kaynakların.
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2 sm:p-5">
        {suggestions.map(({ topic, resources }) => (
          <article
            key={topic.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text-primary)]">
                  {topic.name}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                  Zayıf konu · ort. {topic.avgWrong.toFixed(1)} yanlış
                </p>
              </div>
              <BookMarked className="h-4 w-4 shrink-0 text-violet-500" />
            </div>

            <ul className="mt-3 space-y-2">
              {resources.map((resource) => (
                <li
                  key={resource.resourceTopicId}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-secondary)]">
                      {resource.name}
                    </p>
                    <p className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
                      {contentKindLabel(resource.contentKind)}
                    </p>
                  </div>
                  {resource.status ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      <StatusChip status={resource.status} size="sm" />
                      {statusLabel(resource.status)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
