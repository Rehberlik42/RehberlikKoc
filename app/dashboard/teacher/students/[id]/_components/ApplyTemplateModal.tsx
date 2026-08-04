"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  LayoutTemplate,
  Loader2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TemplateListItem = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  taskCount: number;
};

type TemplateTaskRow = {
  day_offset: number;
  task_type: string;
  title: string;
  subject_id: number | null;
  topic_id: number | null;
  study_resource_id: number | null;
  study_resource_topic_id: number | null;
  details: Record<string, unknown> | null;
  order_index: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  weekDateStrs: string[];
  weekRangeLabel: string;
  existingTaskCount: number;
  taskCountForDate: (date: string) => number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  draftMode?: boolean;
}

export default function ApplyTemplateModal({
  open,
  onClose,
  studentId,
  weekDateStrs,
  weekRangeLabel,
  existingTaskCount,
  taskCountForDate,
  onSuccess,
  onError,
  draftMode = false,
}: Props) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [applying, setApplying] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmNeeded, setConfirmNeeded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoadingList(true);
      setSelectedId(null);
      setConfirmNeeded(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
          setLoadingList(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("program_templates")
        .select(
          "id, name, description, created_at, program_template_tasks(count)"
        )
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        onError("Şablonlar yüklenemedi: " + error.message);
        setTemplates([]);
        setLoadingList(false);
        return;
      }

      const mapped: TemplateListItem[] = (data ?? []).map((row) => {
        const countRaw = row.program_template_tasks;
        let taskCount = 0;
        if (Array.isArray(countRaw) && countRaw[0]) {
          const c = (countRaw[0] as { count?: number }).count;
          taskCount = typeof c === "number" ? c : 0;
        } else if (
          countRaw &&
          typeof countRaw === "object" &&
          "count" in countRaw
        ) {
          const c = (countRaw as { count?: number }).count;
          taskCount = typeof c === "number" ? c : 0;
        }
        return {
          id: row.id as number,
          name: row.name as string,
          description: (row.description as string | null) ?? null,
          created_at: row.created_at as string,
          taskCount,
        };
      });

      setTemplates(mapped);
      setLoadingList(false);
    })();

    return () => {
      cancelled = true;
    };
    // Only reload when modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, applying]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  const applyTemplate = async (templateId: number) => {
    setApplying(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
      setApplying(false);
      return;
    }

    const { data: templateTasks, error: tasksError } = await supabase
      .from("program_template_tasks")
      .select(
        "day_offset, task_type, title, subject_id, topic_id, study_resource_id, study_resource_topic_id, details, order_index"
      )
      .eq("template_id", templateId)
      .order("day_offset", { ascending: true })
      .order("order_index", { ascending: true });

    if (tasksError) {
      onError("Şablon görevleri okunamadı: " + tasksError.message);
      setApplying(false);
      return;
    }

    const rows = (templateTasks ?? []) as TemplateTaskRow[];
    if (rows.length === 0) {
      onError("Bu şablonda uygulanacak görev yok.");
      setApplying(false);
      return;
    }

    const dayCounters = new Map<string, number>();

    try {
      await Promise.all(
        rows.map(async (row) => {
          const offset = Math.min(6, Math.max(0, Number(row.day_offset) || 0));
          const planDate = weekDateStrs[offset];
          if (!planDate) {
            throw new Error(`Geçersiz gün ofseti: ${row.day_offset}`);
          }

          const used = dayCounters.get(planDate) ?? 0;
          const orderIndex = taskCountForDate(planDate) + used;
          dayCounters.set(planDate, used + 1);

          const { error } = await supabase.from("study_plan_tasks").insert({
            student_id: studentId,
            teacher_id: user.id,
            plan_date: planDate,
            task_type: row.task_type,
            title: row.title,
            subject_id: row.subject_id,
            topic_id: row.topic_id,
            study_resource_id: row.study_resource_id,
            study_resource_topic_id: row.study_resource_topic_id,
            details: row.details ?? {},
            order_index: orderIndex,
            is_completed: false,
            completed_at: null,
            is_published: !draftMode,
          });
          if (error) throw error;
        })
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" &&
              err &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Uygulama başarısız";
      onError("Şablon uygulanamadı: " + message);
      setApplying(false);
      return;
    }

    setApplying(false);
    onSuccess(`${rows.length} görev şablondan eklendi`);
    onClose();
  };

  const handleApplyClick = () => {
    if (selectedId == null) {
      onError("Önce bir şablon seç.");
      return;
    }
    if (existingTaskCount > 0 && !confirmNeeded) {
      setConfirmNeeded(true);
      return;
    }
    void applyTemplate(selectedId);
  };

  if (!mounted || !open) return null;

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={() => !applying && onClose()}
        className="fixed inset-0 bg-black/50"
      />

      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-template-title"
          className="relative my-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
                <LayoutTemplate className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h2
                  id="apply-template-title"
                  className="text-base font-bold text-[var(--text-primary)]"
                >
                  Şablondan Oluştur
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Hedef hafta: {weekRangeLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !applying && onClose()}
              disabled={applying}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {confirmNeeded && selected && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-100">
                    Bu haftada zaten {existingTaskCount} görev var
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-100/80">
                    “{selected.name}” şablonundaki {selected.taskCount} görev
                    mevcut programın üzerine yazılmadan eklenecek. Devam etmek
                    istiyor musunuz?
                  </p>
                </div>
              </div>
            )}

            {loadingList ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Henüz kayıtlı şablon yok. Önce bir haftayı “Şablon Olarak
                Kaydet” ile kaydedin.
              </p>
            ) : (
              <ul className="space-y-2">
                {templates.map((t) => {
                  const active = selectedId === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={applying}
                        onClick={() => {
                          setSelectedId(t.id);
                          setConfirmNeeded(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-60 ${
                          active
                            ? "border-[var(--primary)]/50 bg-[var(--primary)]/15"
                            : "border-[var(--border)] bg-white/[0.02] hover:border-[var(--primary)]/30 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]"
                              : "border-[var(--border)] text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-[var(--text-primary)]">
                            {t.name}
                          </span>
                          {t.description ? (
                            <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                              {t.description}
                            </span>
                          ) : null}
                          <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            {t.taskCount} görev
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 gap-3 border-t border-[var(--border)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={
                applying || loadingList || selectedId == null || templates.length === 0
              }
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-[var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                confirmNeeded
                  ? "bg-amber-600/90 hover:bg-amber-600"
                  : "bg-[var(--primary)]/90 hover:bg-[var(--primary)]"
              }`}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LayoutTemplate className="h-4 w-4" />
              )}
              {confirmNeeded ? "Evet, Ekle" : "Uygula"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
