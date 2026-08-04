"use client";

import { useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { matchesTr } from "@/lib/program/tr-search";
import type { ProgramSubject } from "../program-types";
import type { BatchPoolData } from "./batch-data";
import { flattenProgramTopics, type BatchTopicRow } from "./batch-utils";

type TabId = "weak" | "not_started" | "all";

interface Props {
  subjects: ProgramSubject[];
  pool: BatchPoolData | null;
  loading: boolean;
  selectedKeys: Set<string>;
  onChangeSelected: (next: Set<string>) => void;
}

export default function TopicPool({
  subjects,
  pool,
  loading,
  selectedKeys,
  onChangeSelected,
}: Props) {
  const [tab, setTab] = useState<TabId>("weak");
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);

  const allRows = useMemo(() => flattenProgramTopics(subjects), [subjects]);
  const byTopicId = useMemo(() => {
    const map = new Map<number, BatchTopicRow[]>();
    for (const row of allRows) {
      const list = map.get(row.topicId) ?? [];
      list.push(row);
      map.set(row.topicId, list);
    }
    return map;
  }, [allRows]);

  const weakRows = useMemo((): BatchTopicRow[] => {
    if (!pool) return [];
    const rows: BatchTopicRow[] = [];
    for (const w of pool.weak) {
      const matches = byTopicId.get(w.id);
      if (!matches?.length) {
        rows.push({
          key: `?:${w.id}`,
          subjectId: 0,
          topicId: w.id,
          topicName: w.name,
          subjectName: "",
          label: w.name,
          badge:
            w.successRate != null ? `%${w.successRate}` : `ort. ${w.avgWrong.toFixed(1)} yanlış`,
        });
        continue;
      }
      for (const m of matches) {
        rows.push({
          ...m,
          badge:
            w.successRate != null
              ? `%${w.successRate}`
              : `ort. ${w.avgWrong.toFixed(1)} yanlış`,
        });
      }
    }
    return rows;
  }, [pool, byTopicId]);

  const notStartedRows = useMemo((): BatchTopicRow[] => {
    if (!pool) return [];
    const rows: BatchTopicRow[] = [];
    for (const topicId of pool.notStartedTopicIds) {
      const matches = byTopicId.get(topicId);
      if (!matches) continue;
      for (const m of matches) {
        rows.push({ ...m, badge: "Başlanmadı" });
      }
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label, "tr-TR"));
  }, [pool, byTopicId]);

  const tabRows = tab === "weak" ? weakRows : tab === "not_started" ? notStartedRows : allRows;

  const filtered = useMemo(() => {
    return tabRows.filter((row) => {
      if (subjectFilter != null && row.subjectId !== subjectFilter) return false;
      if (!matchesTr(row.label, query)) return false;
      return true;
    });
  }, [tabRows, subjectFilter, query]);

  const selectableKeys = filtered
    .filter((r) => r.subjectId > 0)
    .map((r) => r.key);

  const toggle = (key: string, subjectId: number) => {
    if (subjectId <= 0) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChangeSelected(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selectedKeys);
    for (const k of selectableKeys) next.add(k);
    onChangeSelected(next);
  };

  const clearAll = () => onChangeSelected(new Set());

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "weak", label: "Zayıf", count: weakRows.length },
    { id: "not_started", label: "Başlanmayan", count: notStartedRows.length },
    { id: "all", label: "Tümü", count: allRows.length },
  ];

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-3 pt-3">
        <div className="flex gap-1" role="tablist" aria-label="Konu havuzu">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
                tab === t.id
                  ? "bg-[var(--primary)]/15 text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t.label}{" "}
              <span className="text-[var(--text-muted)]">({t.count})</span>
            </button>
          ))}
        </div>

        <div className="relative mt-2 pb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konu ara…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-white/20 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 pb-3">
          <button
            type="button"
            onClick={() => setSubjectFilter(null)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
              subjectFilter == null
                ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Tüm dersler
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                setSubjectFilter((prev) => (prev === s.id ? null : s.id))
              }
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${
                subjectFilter === s.id
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {s.exam ? `${s.exam} ` : ""}
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] py-2 text-[11px]">
          <span className="text-[var(--text-muted)]">
            {selectedKeys.size} seçili · {filtered.length} görünür
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="font-semibold text-[var(--accent)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            >
              Tümünü seç
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="font-semibold text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
            >
              Temizle
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Konular yükleniyor…</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-[var(--text-muted)]">
            Bu sekmede konu yok
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((row) => {
              const disabled = row.subjectId <= 0;
              const checked = selectedKeys.has(row.key);
              return (
                <li key={row.key}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 ${
                      checked
                        ? "bg-[var(--primary)]/10"
                        : "hover:bg-[var(--surface-2)]"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(row.key, row.subjectId)}
                      className="h-3.5 w-3.5 shrink-0 rounded border-[var(--border)] accent-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                    />
                    <span className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">
                      {row.label}
                    </span>
                    {row.badge ? (
                      <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                        {row.badge}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
