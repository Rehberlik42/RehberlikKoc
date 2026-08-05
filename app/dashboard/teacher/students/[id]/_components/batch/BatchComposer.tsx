"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  buildSuggestedTitle,
  buildTaskInsertPayload,
} from "@/lib/program/task-payload";
import {
  getTaskDurationMinutes,
  type DailyTargetUnit,
} from "@/lib/weekly-program-summary";
import type { ProgramSubject } from "../program-types";
import TopicPool from "./TopicPool";
import BatchSettings, { type BatchSaveSettings } from "./BatchSettings";
import {
  DAY_LABELS_SHORT,
  flattenProgramTopics,
  type PlannedBatchTask,
} from "./batch-utils";
import {
  findLinkedResourceTopicId,
  getCachedBatchPool,
  loadBatchPool,
  loadBatchResourceTopics,
  type BatchPoolData,
} from "./batch-data";

type PlanTaskLike = {
  plan_date: string;
  start_time: string | null;
  end_time: string | null;
  details: Record<string, string | number> | null;
  task_type: string;
  subject: { name: string } | null;
};

interface Props {
  studentId: string;
  subjects: ProgramSubject[];
  weekDays: Date[];
  tasks: PlanTaskLike[];
  taskCountForDate: (date: string) => number;
  dailyTargetMinutes: number | null;
  dailyTargetTasks: number | null;
  dailyTargetUnit: DailyTargetUnit;
  draftMode: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  onError: (message: string) => void;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BatchComposer({
  studentId,
  subjects,
  weekDays,
  tasks,
  taskCountForDate,
  dailyTargetMinutes,
  dailyTargetTasks,
  dailyTargetUnit,
  draftMode,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pool, setPool] = useState<BatchPoolData | null>(
    () => getCachedBatchPool(studentId)
  );
  const [poolLoading, setPoolLoading] = useState(
    () => getCachedBatchPool(studentId) == null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getCachedBatchPool(studentId)) {
      setPool(getCachedBatchPool(studentId));
      setPoolLoading(false);
      return;
    }
    let cancelled = false;
    setPoolLoading(true);
    void loadBatchPool(studentId)
      .then((data) => {
        if (!cancelled) {
          setPool(data);
          setPoolLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPoolLoading(false);
        onError(
          "Konu havuzu yüklenemedi: " +
            (err instanceof Error ? err.message : "bilinmeyen hata")
        );
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, onError]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const allRows = useMemo(() => flattenProgramTopics(subjects), [subjects]);
  const selectedTopics = useMemo(
    () => allRows.filter((r) => selectedKeys.has(r.key)),
    [allRows, selectedKeys]
  );

  const weekDayChips = useMemo(
    () =>
      weekDays.map((d, i) => ({
        dateStr: toISODate(d),
        label: d.toLocaleDateString("tr-TR", { weekday: "long" }),
        short: DAY_LABELS_SHORT[i],
      })),
    [weekDays]
  );

  const existingMinutesByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      map.set(
        t.plan_date,
        (map.get(t.plan_date) ?? 0) + getTaskDurationMinutes(t)
      );
    }
    return map;
  }, [tasks]);

  const existingTaskCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      map.set(t.plan_date, (map.get(t.plan_date) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const handleSave = useCallback(
    async (planned: PlannedBatchTask[], settings: BatchSaveSettings) => {
      if (planned.length === 0) return;
      setSaving(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaving(false);
        onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
        return;
      }

      let resourceTopics: { id: number; topic_id: number | null }[] = [];
      if (settings.resourceId != null) {
        resourceTopics = await loadBatchResourceTopics(settings.resourceId);
      }

      const orderCursor = new Map<string, number>();
      const payloads = planned.map((p) => {
        const subject = subjects.find((s) => s.id === p.subjectId);
        const title = buildSuggestedTitle(
          settings.taskType,
          subject,
          p.topicName
        );
        const baseOrder = orderCursor.get(p.planDate) ?? taskCountForDate(p.planDate);
        orderCursor.set(p.planDate, baseOrder + 1);

        const details: Record<string, string | number> = {};
        if (settings.durationMinutes != null && settings.durationMinutes > 0) {
          details.estimated_duration_minutes = settings.durationMinutes;
        }
        if (settings.coachNote) {
          details.coach_note = settings.coachNote;
        }

        const studyResourceTopicId =
          settings.resourceId != null
            ? findLinkedResourceTopicId(resourceTopics, p.topicId)
            : null;

        return buildTaskInsertPayload({
          studentId,
          teacherId: user.id,
          planDate: p.planDate,
          taskType: settings.taskType,
          title,
          subjectId: settings.taskType === "deneme" ? null : p.subjectId,
          topicId: settings.taskType === "deneme" ? null : p.topicId,
          studyResourceId: settings.resourceId,
          studyResourceTopicId,
          details,
          orderIndex: baseOrder,
          draftMode,
        });
      });

      const { data, error } = await supabase
        .from("study_plan_tasks")
        .insert(payloads)
        .select("id");

      setSaving(false);

      if (error) {
        onError(
          `Toplu ekleme başarısız: ${error.message}. Hiçbir görev eklenmedi.`
        );
        return;
      }

      const inserted = data?.length ?? 0;
      if (inserted === 0) {
        onError("Hiçbir görev eklenemedi.");
        return;
      }

      if (inserted < payloads.length) {
        onError(
          `${inserted}/${payloads.length} görev eklendi; kalanlar başarısız oldu.`
        );
        onSuccess(inserted);
        return;
      }

      onSuccess(inserted);
    },
    [
      subjects,
      taskCountForDate,
      studentId,
      draftMode,
      onError,
      onSuccess,
    ]
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Geri
          </button>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Toplu Besteleme
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Konuları seç, bir kez ayarla, günlere dağıt
            </p>
          </div>
        </div>
        {poolLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Havuz yükleniyor
          </span>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <TopicPool
          subjects={subjects}
          pool={pool}
          loading={poolLoading}
          selectedKeys={selectedKeys}
          onChangeSelected={setSelectedKeys}
        />
        <BatchSettings
          selectedTopics={selectedTopics}
          weekDays={weekDayChips}
          existingMinutesByDate={existingMinutesByDate}
          existingTaskCountByDate={existingTaskCountByDate}
          dailyTargetMinutes={dailyTargetMinutes}
          dailyTargetTasks={dailyTargetTasks}
          dailyTargetUnit={dailyTargetUnit}
          saving={saving}
          onSave={(planned, settings) => {
            void handleSave(planned, settings);
          }}
        />
      </div>
    </div>
  );
}
