import { BookOpen, Sparkles } from "lucide-react";
import {
  normalizeStatus,
  StatusChip,
  type ResourceStatus,
} from "@/lib/resource-status-ui";
import {
  findWeakTopics,
  type WeakTopic,
} from "@/lib/program/weak-topics";

export { findWeakTopics, type WeakTopic };

const SUGGESTED_CONTENT_KINDS = new Set(["soru_bankasi", "konu_anlatimi"]);

export interface SmartResourceTopicRecord {
  id: number;
  topic_id: number | null;
  resource:
    | {
        id: string | number;
        name: string;
        content_kind: string | null;
      }
    | {
        id: string | number;
        name: string;
        content_kind: string | null;
      }[]
    | null;
}

export interface SmartResourceProgressRecord {
  study_resource_topic_id: number;
  status: string | null;
}

export interface SuggestedResource {
  resourceTopicId: number;
  resourceId: string;
  name: string;
  status: ResourceStatus | null;
}

export interface SmartResourceSuggestion {
  topic: WeakTopic;
  resources: SuggestedResource[];
}

export function buildSmartResourceSuggestions(
  weakTopics: WeakTopic[],
  resourceTopics: SmartResourceTopicRecord[],
  progressRows: SmartResourceProgressRecord[]
): SmartResourceSuggestion[] {
  const progressByResourceTopic = new Map(
    progressRows.map((row) => [
      row.study_resource_topic_id,
      normalizeStatus(row.status),
    ])
  );
  const resourcesByTopic = new Map<number, SuggestedResource[]>();

  for (const row of resourceTopics) {
    if (row.topic_id == null) continue;
    const resource = Array.isArray(row.resource)
      ? row.resource[0] ?? null
      : row.resource;
    if (!resource || !SUGGESTED_CONTENT_KINDS.has(resource.content_kind ?? "")) {
      continue;
    }

    const status = progressByResourceTopic.get(row.id) ?? null;
    if (status === "tamamlandi") continue;

    const resources = resourcesByTopic.get(row.topic_id) ?? [];
    resources.push({
      resourceTopicId: row.id,
      resourceId: String(resource.id),
      name: resource.name,
      status,
    });
    resourcesByTopic.set(row.topic_id, resources);
  }

  return weakTopics.map((topic) => ({
    topic,
    resources: (resourcesByTopic.get(topic.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "tr-TR")
    ),
  }));
}

function statusLabel(status: ResourceStatus): string {
  switch (status) {
    case "tamamlandi":
      return "Tamamlandı";
    case "baslandi":
      return "Başlandı";
    case "devam_ediyor":
      return "Devam ediyor";
    case "tekrar_gerekli":
      return "Tekrar gerekli";
    default:
      return "Başlanmadı";
  }
}

export default function SmartResourceSuggestions({
  suggestions,
  examCount,
  loadFailed = false,
}: {
  suggestions: SmartResourceSuggestion[];
  examCount: number;
  loadFailed?: boolean;
}) {
  const hasWeakTopics = suggestions.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
      <div className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
          <Sparkles className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Akıllı Kaynak Önerileri
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Son {examCount || 5} denemedeki zayıf konulara göre, tamamlanmamış
            kaynaklar.
          </p>
        </div>
      </div>

      {loadFailed ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          Kaynak önerileri şu anda yüklenemedi.
        </p>
      ) : examCount === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          Öneri oluşturmak için yeterli deneme verisi yok.
        </p>
      ) : !hasWeakTopics ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          Son denemelerde kaynak önerisi gerektiren zayıf konu bulunmadı.
        </p>
      ) : (
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
                <BookOpen className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              </div>

              {resources.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
                  Bu konu için tamamlanmamış uygun kaynak bulunamadı.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {resources.map((resource) => (
                    <li
                      key={resource.resourceTopicId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-xs font-semibold text-[var(--text-secondary)]">
                        {resource.name}
                      </span>
                      {resource.status ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
                          <StatusChip status={resource.status} size="sm" />
                          {statusLabel(resource.status)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
