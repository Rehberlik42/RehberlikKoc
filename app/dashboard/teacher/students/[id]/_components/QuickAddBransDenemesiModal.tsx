"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  BookMarked,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "./SearchableSelect";
import type { ProgramSubject } from "./program-types";

interface Props {
  onClose: () => void;
  studentId: string;
  teacherId?: string | null;
  planDate: string;
  dayLabel: string;
  subjects: ProgramSubject[];
  taskCountForDate: (date: string) => number;
  onSuccess: (planDate: string) => void;
  onError: (message: string) => void;
  weekDays?: Date[];
}

const DAY_LABELS_SHORT = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
] as const;

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDaySub(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0";

const labelCls =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]";

export default function QuickAddBransDenemesiModal({
  onClose,
  studentId,
  teacherId,
  planDate,
  dayLabel,
  subjects,
  taskCountForDate,
  onSuccess,
  onError,
  weekDays,
}: Props) {
  const supabase = createClient();
  const [subjectId, setSubjectId] = useState("");
  const [resourceLabel, setResourceLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [additionalDays, setAdditionalDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);

  const handleSubmit = async () => {
    if (!planDate) {
      onError("Geçersiz gün.");
      return;
    }
    if (!subjectId) {
      onError("Lütfen bir ders seçin.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
      setLoading(false);
      return;
    }

    const teacher = teacherId ?? user.id;
    const dersAdi = selectedSubject?.name ?? "Ders";
    const title = `${dersAdi} Branş Denemesi`;

    const details: Record<string, string | number> = {};
    if (resourceLabel.trim()) details.resource_label = resourceLabel.trim();
    if (duration !== "" && !Number.isNaN(Number(duration))) {
      details.estimated_duration_minutes = Number(duration);
    }

    const insertTaskForDate = async (targetDate: string) => {
      const { error } = await supabase.from("study_plan_tasks").insert({
        student_id: studentId,
        teacher_id: teacher,
        plan_date: targetDate,
        subject_id: parseInt(subjectId, 10),
        topic_id: null,
        task_type: "bras_deneme",
        title,
        start_time: null,
        end_time: null,
        break_minutes: null,
        order_index: taskCountForDate(targetDate),
        is_completed: false,
        study_resource_id: null,
        study_resource_topic_id: null,
        details,
      });
      if (error) throw { date: targetDate, message: error.message };
      return targetDate;
    };

    const targetDates = Array.from(
      new Set([planDate, ...additionalDays])
    ).sort();

    const results = await Promise.allSettled(
      targetDates.map((d) => insertTaskForDate(d))
    );

    setLoading(false);

    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") succeeded.push(r.value);
      else {
        const reason = r.reason as { date?: string };
        failed.push(reason?.date ?? "?");
      }
    }

    for (const d of succeeded) onSuccess(d);

    if (failed.length === 0) {
      onClose();
      return;
    }

    if (succeeded.length === 0) {
      onError(`Kayıt sırasında hata oluştu (${failed.length} gün başarısız).`);
      return;
    }

    onError(
      `${succeeded.length} güne eklendi, ${failed.length} günde hata oluştu (${failed.join(", ")}).`
    );
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Paneli kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-brans-title"
        className="fixed inset-y-0 right-0 flex w-full max-w-md animate-in slide-in-from-right fill-mode-both flex-col border-l border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 duration-300"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />

        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2
              id="quick-brans-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              Branş Denemesi — {dayLabel}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Hızlı ekleme
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <SearchableSelect
            label="Ders"
            icon={<BookMarked className="h-3.5 w-3.5" />}
            value={subjectId}
            onChange={setSubjectId}
            options={[
              { value: "", label: "— Ders seçin —" },
              ...subjects.map((s) => ({
                value: String(s.id),
                label: s.name,
                group: s.exam ?? "Diğer",
              })),
            ]}
            placeholder="— Ders seçin —"
          />

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              <FileText className="h-3.5 w-3.5" />
              Kaynak / Yayın (opsiyonel)
            </label>
            <input
              type="text"
              value={resourceLabel}
              onChange={(e) => setResourceLabel(e.target.value)}
              placeholder='örn. "Rebelem"'
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              <Clock className="h-3.5 w-3.5" />
              Tahmini Süre (dakika, opsiyonel)
            </label>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="örn. 40"
              className={inputCls}
            />
          </div>

          {weekDays && weekDays.length > 0 && (
            <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Başka günlere de ekle
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Birincil gün ({dayLabel}) zaten seçili. İstersen aynı görevi
                haftanın diğer günlerine de ekle.
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {weekDays.map((d, i) => {
                  const dateStr = toISODateLocal(d);
                  const isPrimary = dateStr === planDate;
                  const checked = isPrimary || additionalDays.has(dateStr);
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPrimary || loading}
                      onClick={() => {
                        if (isPrimary) return;
                        setAdditionalDays((prev) => {
                          const next = new Set(prev);
                          if (next.has(dateStr)) next.delete(dateStr);
                          else next.add(dateStr);
                          return next;
                        });
                      }}
                      className={`flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-default ${
                        checked
                          ? isPrimary
                            ? "border-[var(--primary)]/50 bg-[var(--primary)]/15 text-[var(--accent)]"
                            : "border-[var(--primary)]/40 bg-[var(--primary)]/20 text-[var(--text-primary)]"
                          : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--primary)]/30 hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="text-xs font-bold">
                        {DAY_LABELS_SHORT[i]}
                        {isPrimary ? " · bu gün" : ""}
                      </span>
                      <span className="text-[10px] opacity-80">
                        {formatDaySub(d)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)]"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all duration-300 hover:shadow-[var(--primary)]/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
