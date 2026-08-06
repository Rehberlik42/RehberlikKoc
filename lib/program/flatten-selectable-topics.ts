import type { ProgramSubject } from "@/app/dashboard/teacher/students/[id]/_components/program-types";

export type SelectableTopicRow = {
  /** subjectId:topicId */
  key: string;
  subjectId: number;
  topicId: number;
  topicName: string;
  subjectName: string;
  /** Kaynak seçimi / form state için ana ünite id */
  anaUniteId: string;
  parentId: number | null;
  parentName: string | null;
  label: string;
};

/** parent_id ile işaretlenen id'ler — en az bir çocuğu olan ana üniteler */
export function getParentIdsWithChildren(
  topics: { parent_id: number | null }[]
): Set<number> {
  return new Set(
    topics.map((t) => t.parent_id).filter((id): id is number => id !== null)
  );
}

/**
 * Seçilebilir (yaprak) konular.
 *
 * - parent_id === null tek başına ana ünite demek değildir; ona bağlı en az bir
 *   çocuk varsa ünite etiketidir ve seçilemez.
 * - Çocuğu olmayan parent_id === null konular yapraktır ve seçilebilir.
 * - parent_id dolu alt konular seçilebilir.
 * - Düz derslerde (hiç çocuk yok) tüm konular seçilebilir.
 */
export function flattenSelectableTopics(
  subjects: ProgramSubject[]
): SelectableTopicRow[] {
  const rows: SelectableTopicRow[] = [];

  for (const subject of subjects) {
    const examPrefix = subject.exam ? `${subject.exam} ` : "";
    const dersLabel = `${examPrefix}${subject.name}`;
    const topics = subject.topics ?? [];
    const parentIdsWithChildren = getParentIdsWithChildren(topics);
    const byId = new Map(topics.map((t) => [t.id, t]));

    for (const topic of topics) {
      // Çocuğu olan ana ünite — seçilebilir satır değil
      if (parentIdsWithChildren.has(topic.id)) continue;

      const parent =
        topic.parent_id != null ? (byId.get(topic.parent_id) ?? null) : null;
      const label = parent
        ? `${dersLabel} · ${parent.name} · ${topic.name}`
        : `${dersLabel} · ${topic.name}`;

      rows.push({
        key: `${subject.id}:${topic.id}`,
        subjectId: subject.id,
        topicId: topic.id,
        topicName: topic.name,
        subjectName: subject.name,
        anaUniteId: String(topic.parent_id ?? topic.id),
        parentId: topic.parent_id,
        parentName: parent?.name ?? null,
        label,
      });
    }
  }

  return rows;
}
