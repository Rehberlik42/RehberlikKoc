"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { BookPlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  studentId: string;
  initialCanAddResources: boolean;
}

export default function ResourcePermissionToggle({
  studentId,
  initialCanAddResources,
}: Props) {
  const [enabled, setEnabled] = useState(initialCanAddResources);
  const [saving, setSaving] = useState(false);

  async function handleToggle(next: boolean) {
    const prev = enabled;
    setEnabled(next);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ can_add_resources: next })
      .eq("id", studentId);

    setSaving(false);

    if (error) {
      setEnabled(prev);
      toast.error("İzin güncellenemedi: " + error.message);
      return;
    }

    toast.success(
      next
        ? "Öğrenci artık kaynak ekleyebilir."
        : "Öğrencinin kaynak ekleme izni kapatıldı."
    );
  }

  return (
    <>
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

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15">
            <BookPlus className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Öğrenci kaynak ekleyebilir
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Açıkken öğrenci kendi kitaplarını ekleyip işaretleyebilir; kaynaklar senin
              havuzunda da görünür.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Öğrenci kaynak ekleyebilir"
          disabled={saving}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-60 ${
            enabled
              ? "border-[var(--primary)]/50 bg-[var(--primary)]"
              : "border-[var(--border)] bg-[var(--surface-2)]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
          {saving && (
            <Loader2 className="absolute -right-7 h-4 w-4 animate-spin text-[var(--text-muted)]" />
          )}
        </button>
      </div>
    </>
  );
}
