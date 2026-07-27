"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface CurriculumTopic {
  id: number;
  name: string;
  parent_id: number | null;
  order_index: number;
}

interface TopicEditorProps {
  /** Seçili ders id'si — değişince konuları yeniden çeker. */
  subjectId?: number | null;
}

export default function TopicEditor({ subjectId = null }: TopicEditorProps) {
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjectId == null) {
      setTopics([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, parent_id, order_index")
        .eq("subject_id", subjectId)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      setLoading(false);
      if (error) {
        setTopics([]);
        return;
      }
      setTopics((data ?? []) as CurriculumTopic[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const { rootTopics, childrenByParent, parentIds } = useMemo(() => {
    const parentIds = new Set(
      topics.map((t) => t.parent_id).filter((id): id is number => id !== null)
    );
    const rootTopics = topics.filter((t) => t.parent_id === null);
    const childrenByParent = new Map<number, CurriculumTopic[]>();
    for (const t of topics) {
      if (t.parent_id != null) {
        const arr = childrenByParent.get(t.parent_id) ?? [];
        arr.push(t);
        childrenByParent.set(t.parent_id, arr);
      }
    }
    return { rootTopics, childrenByParent, parentIds };
  }, [topics]);

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-5">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">
        Kazanımlar (Otomatik)
      </h3>

      {subjectId == null ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          Önce ders seçin
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-6 text-sm text-[var(--text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Kazanımlar yükleniyor…
        </div>
      ) : topics.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          Bu ders için henüz merkezi kazanım tanımlanmamış.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--accent)]">
              {topics.length} kazanım
            </span>{" "}
            kaynak oluşturulunca otomatik eklenecek.
          </p>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
            <ul className="divide-y divide-[var(--border)]">
              {rootTopics.map((root) => {
                const isParent = parentIds.has(root.id);
                const children = childrenByParent.get(root.id) ?? [];
                return (
                  <li key={root.id}>
                    <p
                      className={`px-3 py-2 text-xs ${
                        isParent
                          ? "font-bold text-[var(--text-primary)]"
                          : "font-semibold text-[var(--text-secondary)]"
                      }`}
                    >
                      {root.name}
                    </p>
                    {children.length > 0 && (
                      <ul>
                        {children.map((child) => (
                          <li
                            key={child.id}
                            className="border-t border-[var(--border)]/50 py-1.5 pl-6 pr-3 text-[11px] text-[var(--text-muted)]"
                          >
                            {child.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
