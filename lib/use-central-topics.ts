"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CentralTopic {
  id: number;
  name: string;
  parent_id: number | null;
}

/**
 * Bir dersin merkezi müfredat konularını (topics) çeker.
 * subjectId null ise boş dizi döner.
 */
export function useCentralTopics(subjectId: number | null | undefined) {
  const [topics, setTopics] = useState<CentralTopic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subjectId == null) {
      setTopics([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, parent_id")
        .eq("subject_id", subjectId)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      setLoading(false);
      if (error) {
        setTopics([]);
        return;
      }
      setTopics((data ?? []) as CentralTopic[]);
    })();

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const parentIdsWithChildren = useMemo(
    () =>
      new Set(
        topics.map((t) => t.parent_id).filter((id): id is number => id !== null)
      ),
    [topics]
  );

  const hasHierarchy = parentIdsWithChildren.size > 0;

  return { topics, loading, parentIdsWithChildren, hasHierarchy };
}
