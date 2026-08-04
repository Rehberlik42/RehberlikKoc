"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookmarkPlus, FileText, Loader2, Type, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  weekStartStr: string;
  weekEndStr: string;
  weekRangeLabel: string;
  sourceTaskCount: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function dayOffsetFromWeekStart(planDate: string, weekStartStr: string): number {
  const plan = new Date(planDate + "T12:00:00");
  const start = new Date(weekStartStr + "T12:00:00");
  const diff = Math.round(
    (plan.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.min(6, Math.max(0, diff));
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-0";

const labelCls =
  "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]";

export default function SaveAsTemplateModal({
  open,
  onClose,
  studentId,
  weekStartStr,
  weekEndStr,
  weekRangeLabel,
  sourceTaskCount,
  onSuccess,
  onError,
}: Props) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, loading]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      onError("Şablon adı zorunlu.");
      return;
    }
    if (sourceTaskCount === 0) {
      onError("Bu haftada şablona kaydedilecek görev yok.");
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

    const { data: weekRows, error: weekError } = await supabase
      .from("study_plan_tasks")
      .select("*")
      .eq("student_id", studentId)
      .gte("plan_date", weekStartStr)
      .lte("plan_date", weekEndStr)
      .order("plan_date", { ascending: true })
      .order("order_index", { ascending: true });

    if (weekError) {
      onError("Görevler okunamadı: " + weekError.message);
      setLoading(false);
      return;
    }

    const rows = weekRows ?? [];
    if (rows.length === 0) {
      onError("Bu haftada şablona kaydedilecek görev yok.");
      setLoading(false);
      return;
    }

    const { data: template, error: templateError } = await supabase
      .from("program_templates")
      .insert({
        teacher_id: user.id,
        name: trimmedName,
        description: description.trim() || null,
      })
      .select("id")
      .single();

    if (templateError || !template) {
      onError(
        "Şablon kaydedilemedi: " +
          (templateError?.message ?? "Bilinmeyen hata")
      );
      setLoading(false);
      return;
    }

    const templateId = template.id as number;

    try {
      await Promise.all(
        rows.map(async (row) => {
          const { error } = await supabase.from("program_template_tasks").insert({
            template_id: templateId,
            day_offset: dayOffsetFromWeekStart(
              String(row.plan_date),
              weekStartStr
            ),
            task_type: row.task_type,
            title: row.title,
            subject_id: row.subject_id,
            topic_id: row.topic_id,
            study_resource_id: row.study_resource_id,
            study_resource_topic_id: row.study_resource_topic_id,
            details: row.details ?? {},
            order_index: row.order_index ?? 0,
          });
          if (error) throw error;
        })
      );
    } catch (err) {
      await supabase.from("program_templates").delete().eq("id", templateId);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" &&
              err &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Görevler kaydedilemedi";
      onError("Şablon görevleri kaydedilemedi: " + message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess(
      `"${trimmedName}" şablonu ${rows.length} görevle kaydedildi`
    );
    onClose();
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={() => !loading && onClose()}
        className="fixed inset-0 bg-black/50"
      />

      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-template-title"
          className="relative my-4 flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
                <BookmarkPlus className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <h2
                  id="save-template-title"
                  className="text-base font-bold text-[var(--text-primary)]"
                >
                  Şablon Olarak Kaydet
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {weekRangeLabel} · {sourceTaskCount} görev
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls} htmlFor="template-name">
                <Type className="h-3.5 w-3.5" />
                Şablon Adı
              </label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="örn. TYT Yoğun Hafta"
                className={inputCls}
                disabled={loading}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSave();
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelCls} htmlFor="template-desc">
                <FileText className="h-3.5 w-3.5" />
                Açıklama (opsiyonel)
              </label>
              <textarea
                id="template-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bu şablon ne için kullanılır?"
                rows={3}
                className={`${inputCls} resize-none`}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-[var(--border)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || !name.trim() || sourceTaskCount === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)]/90 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
