"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Minus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  computeOverallTargetProgress,
  computeTargetProgress,
  examGroupFromName,
  targetStatusColor,
  targetStatusLabel,
  type NetTrendDirection,
  type TargetProgress,
} from "./exam-analysis-utils";

interface SubjectOption {
  id: number;
  name: string;
  exam_id: number | null;
  color: string | null;
  exam: { name: string } | null;
}

interface ExistingTarget {
  target_net: number;
  note: string | null;
}

interface Props {
  studentId: string;
  subjects: SubjectOption[];
  currentNets: Record<number, number>;
  netSeriesBySubjectId: Record<number, number[]>;
  existingTargets: Record<number, ExistingTarget>;
}

const GROUP_ORDER = ["TYT", "AYT", "LGS", "Diğer"] as const;

function groupLabel(group: string): string {
  if (group === "TYT") return "TYT";
  if (group === "AYT") return "AYT";
  if (group === "LGS") return "LGS";
  return "Diğer";
}

function parseTargetInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed.replace(",", "."));
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function TrendArrow({ direction }: { direction: NetTrendDirection }) {
  if (direction === "up") {
    return <TrendingUp className="h-3.5 w-3.5 text-green-500" aria-hidden />;
  }
  if (direction === "down") {
    return <TrendingDown className="h-3.5 w-3.5 text-orange-500" aria-hidden />;
  }
  return <Minus className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden />;
}

function SubjectProgressPanel({ progress }: { progress: TargetProgress }) {
  const statusColor = targetStatusColor(progress.status);
  const statusLabel = targetStatusLabel(progress.status);

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 pl-3">
      {progress.hasCurrent && progress.targetNet != null && (
        <p className="text-[11px] text-[var(--text-muted)]">
          Şu an{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {progress.currentNet!.toFixed(1)}
          </span>
          <span className="text-[var(--text-muted)]"> / Hedef </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {progress.targetNet.toFixed(1)}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {progress.reached ? (
          <span className="text-xs font-semibold text-green-500">Hedefe ulaştın ✓</span>
        ) : progress.remaining != null ? (
          <span className="text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
            {progress.remaining.toFixed(1)} net kaldı
          </span>
        ) : null}

        {statusLabel && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              color: statusColor,
              borderColor: `${statusColor}44`,
              backgroundColor: `${statusColor}14`,
            }}
          >
            <TrendArrow direction={progress.trendDirection} />
            {statusLabel}
          </span>
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.reached
              ? "bg-green-500"
              : "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
          }`}
          style={{ width: `${Math.max(progress.fillPct, progress.fillPct > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export default function StudentTargets({
  studentId,
  subjects,
  currentNets,
  netSeriesBySubjectId,
  existingTargets,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const [subjectId, target] of Object.entries(existingTargets)) {
      initial[Number(subjectId)] = String(target.target_net);
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const groupedSubjects = useMemo(() => {
    const groups = new Map<string, SubjectOption[]>();

    for (const subject of subjects) {
      const examName = subject.exam?.name ?? "";
      const group = examGroupFromName(examName) ?? "Diğer";
      const list = groups.get(group) ?? [];
      list.push(subject);
      groups.set(group, list);
    }

    return GROUP_ORDER.filter((g) => groups.has(g)).map((group) => ({
      group,
      subjects: (groups.get(group) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "tr-TR")
      ),
    }));
  }, [subjects]);

  const progressBySubjectId = useMemo(() => {
    const map = new Map<number, TargetProgress>();
    for (const subject of subjects) {
      const targetNet = parseTargetInput(values[subject.id] ?? "");
      const progress = computeTargetProgress({
        subjectId: subject.id,
        currentNet: currentNets[subject.id] ?? null,
        targetNet,
        netSeries: netSeriesBySubjectId[subject.id],
      });
      map.set(subject.id, progress);
    }
    return map;
  }, [subjects, values, currentNets, netSeriesBySubjectId]);

  const overallProgress = useMemo(
    () => computeOverallTargetProgress([...progressBySubjectId.values()]),
    [progressBySubjectId]
  );

  function handleChange(subjectId: number, value: string) {
    setValues((prev) => ({ ...prev, [subjectId]: value }));
  }

  async function handleSave() {
    setSaving(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Oturum bulunamadı.");
      setSaving(false);
      return;
    }

    const toUpsert: {
      student_id: string;
      subject_id: number;
      target_net: number;
      set_by: string;
      note: string | null;
    }[] = [];
    const toDelete: number[] = [];

    for (const subject of subjects) {
      const raw = values[subject.id]?.trim() ?? "";
      const hadTarget = subject.id in existingTargets;

      if (raw === "") {
        if (hadTarget) toDelete.push(subject.id);
        continue;
      }

      const parsed = parseFloat(raw.replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        toast.error(`${subject.name} için geçerli bir hedef net girin.`);
        setSaving(false);
        return;
      }

      toUpsert.push({
        student_id: studentId,
        subject_id: subject.id,
        target_net: parsed,
        set_by: user.id,
        note: existingTargets[subject.id]?.note ?? null,
      });
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("student_targets")
        .delete()
        .eq("student_id", studentId)
        .in("subject_id", toDelete);

      if (deleteError) {
        toast.error("Hedef silinemedi: " + deleteError.message);
        setSaving(false);
        return;
      }
    }

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("student_targets")
        .upsert(toUpsert, { onConflict: "student_id,subject_id" });

      if (upsertError) {
        toast.error("Hedefler kaydedilemedi: " + upsertError.message);
        setSaving(false);
        return;
      }
    }

    if (toUpsert.length === 0 && toDelete.length === 0) {
      toast.error("Kaydedilecek hedef yok.");
      setSaving(false);
      return;
    }

    toast.success("Hedefler kaydedildi.");
    router.refresh();
    setSaving(false);
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center">
        <p className="text-sm text-[var(--text-muted)]">Ders bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          },
        }}
      />

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
          <Target className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Ders Hedefleri</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Her derse hedef net belirleyin. Öğrenci bu hedefleri kendi panelinde görecek.
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            &quot;Şu an&quot; değeri son 5 denemenin ders net ortalamasıdır.
          </p>
        </div>
      </div>

      {overallProgress.targetCount > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Genel İlerleme
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Genel:{" "}
            <span className="font-bold text-[var(--text-primary)]">
              {overallProgress.reachedCount}/{overallProgress.targetCount}
            </span>{" "}
            derste hedefe ulaştın
            {overallProgress.overallRemaining > 0 ? (
              <>
                {" "}
                ·{" "}
                <span className="font-semibold tabular-nums">
                  {overallProgress.overallRemaining.toFixed(1)} net kaldı
                </span>
              </>
            ) : overallProgress.overallRemaining <= 0 && overallProgress.targetCount > 0 ? (
              <span className="font-semibold text-green-500"> · Toplam hedefe ulaşıldı</span>
            ) : null}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] transition-all duration-300"
              style={{
                width: `${Math.max(overallProgress.overallFillPct, overallProgress.overallFillPct > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {groupedSubjects.map(({ group, subjects: groupSubjects }) => (
          <div key={group}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {groupLabel(group)}
            </p>
            <div className="space-y-2">
              {groupSubjects.map((subject) => {
                const barColor = subject.color ?? "#4F7CFF";
                const current = currentNets[subject.id];
                const rawValue = values[subject.id] ?? "";
                const progress = progressBySubjectId.get(subject.id)!;

                return (
                  <div
                    key={subject.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-1 shrink-0 rounded-full"
                            style={{ background: barColor }}
                          />
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {subject.name}
                          </p>
                        </div>
                        {!progress.hasTarget && (
                          <p className="mt-1 pl-3 text-[11px] text-[var(--text-muted)]">
                            {current != null ? (
                              <>
                                Şu an:{" "}
                                <span className="font-semibold text-[var(--text-secondary)]">
                                  {current.toFixed(1)} net
                                </span>
                              </>
                            ) : (
                              "Henüz veri yok"
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <label
                          htmlFor={`target-${subject.id}`}
                          className="text-[11px] font-medium text-[var(--text-muted)]"
                        >
                          Hedef
                        </label>
                        <input
                          id={`target-${subject.id}`}
                          type="number"
                          min={0}
                          step={0.25}
                          inputMode="decimal"
                          value={rawValue}
                          onChange={(e) => handleChange(subject.id, e.target.value)}
                          placeholder="—"
                          className="w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold tabular-nums text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--primary)]/50"
                        />
                      </div>
                    </div>

                    {progress.hasTarget && <SubjectProgressPanel progress={progress} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all hover:scale-[1.02] disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Toplu Kaydet
        </button>
      </div>
    </div>
  );
}
