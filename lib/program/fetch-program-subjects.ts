import type { ProgramSubject } from "@/app/dashboard/teacher/students/[id]/_components/program-types";

export type ProgramSubjectsApiRow = {
  id: number;
  name: string;
  color: string | null;
  order_index: number;
  exam_id: number | null;
  exam: { name: string } | { name: string }[] | null;
  topics:
    | {
        id: number;
        name: string;
        order_index: number;
        parent_id: number | null;
      }[]
    | null;
};

function mapApiRows(rows: ProgramSubjectsApiRow[]): ProgramSubject[] {
  return rows.map((s) => {
    const topicsArr = Array.isArray(s.topics) ? s.topics : [];
    const examRaw = s.exam;
    const examName = Array.isArray(examRaw)
      ? (examRaw[0]?.name ?? null)
      : examRaw?.name ?? null;
    return {
      id: s.id,
      name: s.name,
      exam: examName,
      topics: topicsArr
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((t) => ({
          id: t.id,
          name: t.name,
          parent_id: t.parent_id ?? null,
        })),
    };
  });
}

/** Oturum boyu tek çekim — program sekmesi tekrar açılınca ağ yok. */
let subjectsCache: ProgramSubject[] | null = null;
let subjectsPromise: Promise<ProgramSubject[]> | null = null;

export function getCachedProgramSubjects(): ProgramSubject[] | null {
  return subjectsCache;
}

export function loadProgramSubjects(): Promise<ProgramSubject[]> {
  if (subjectsCache) return Promise.resolve(subjectsCache);
  if (subjectsPromise) return subjectsPromise;

  subjectsPromise = fetch("/api/program/subjects")
    .then(async (res) => {
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Subjects HTTP ${res.status}`);
      }
      return res.json() as Promise<ProgramSubjectsApiRow[]>;
    })
    .then((rows) => {
      subjectsCache = mapApiRows(rows);
      return subjectsCache;
    })
    .catch((err) => {
      subjectsPromise = null;
      throw err;
    });

  return subjectsPromise;
}
