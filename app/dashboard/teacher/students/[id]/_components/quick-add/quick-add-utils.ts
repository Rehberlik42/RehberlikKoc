import { matchesTr } from "@/lib/program/tr-search";
import type { BatchTopicRow } from "../batch/batch-utils";

export type ParsedQuickAdd = {
  /** Süre ayrıştırıldıktan sonra kalan arama metni */
  query: string;
  /** Sonda sayı varsa süre (dk); yoksa null */
  durationMinutes: number | null;
};

/**
 * "türev 40" → query "türev", duration 40.
 * Doğal dil yok — yalnızca sondaki tam sayı.
 */
export function parseQuickAddInput(raw: string): ParsedQuickAdd {
  const trimmed = raw.trim();
  if (!trimmed) return { query: "", durationMinutes: null };

  const match = trimmed.match(/^(.*?)(?:\s+)(\d+)$/);
  if (!match) {
    return { query: trimmed, durationMinutes: null };
  }

  const query = match[1].trim();
  const durationMinutes = Number(match[2]);
  if (!query || !Number.isFinite(durationMinutes)) {
    return { query: trimmed, durationMinutes: null };
  }

  return { query, durationMinutes };
}

export function filterQuickAddTopics(
  topics: BatchTopicRow[],
  query: string,
  limit = 5
): BatchTopicRow[] {
  const q = query.trim();
  if (!q) return [];
  return topics
    .filter(
      (t) =>
        matchesTr(t.label, q) ||
        matchesTr(t.topicName, q) ||
        matchesTr(t.subjectName, q)
    )
    .slice(0, limit);
}
