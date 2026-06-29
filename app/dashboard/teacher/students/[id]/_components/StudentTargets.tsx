"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { examGroupFromName } from "./exam-analysis-utils";

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
  existingTargets: Record<number, ExistingTarget>;
}

const GROUP_ORDER = ["TYT", "AYT", "LGS", "Diğer"] as const;

function groupLabel(group: string): string {
  if (group === "TYT") return "TYT";
  if (group === "AYT") return "AYT";
  if (group === "LGS") return "LGS";
  return "Diğer";
}

export default function StudentTargets({
  studentId,
  subjects,
  currentNets,
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
                const targetNum =
                  rawValue.trim() !== ""
                    ? parseFloat(rawValue.replace(",", "."))
                    : null;
                const gap =
                  targetNum != null && !Number.isNaN(targetNum) && current != null
                    ? targetNum - current
                    : null;

                return (
                  <div
                    key={subject.id}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:flex-row sm:items-center"
                  >
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
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                      <div className="flex items-center gap-2">
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
                      {gap != null && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                            gap > 0
                              ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-500"
                              : gap < 0
                                ? "border-green-500/30 bg-green-500/10 text-green-500"
                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
                          }`}
                        >
                          {gap > 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)} net
                        </span>
                      )}
                    </div>
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
