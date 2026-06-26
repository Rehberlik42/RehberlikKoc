"use client";

import { useState, useTransition } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Check } from "lucide-react";
import { setTheme } from "@/app/dashboard/_actions/theme";
import {
  applyThemeToShell,
  resolveTheme,
  THEMES,
  type ThemeId,
} from "@/lib/themes";

export default function ThemePicker({ initialTheme }: { initialTheme: string | null }) {
  const [selected, setSelected] = useState<ThemeId>(resolveTheme(initialTheme));
  const [isPending, startTransition] = useTransition();

  const handleSelect = (themeId: ThemeId) => {
    if (isPending || themeId === selected) return;

    const previous = selected;
    setSelected(themeId);
    applyThemeToShell(themeId);

    startTransition(async () => {
      const result = await setTheme(themeId);
      if ("error" in result) {
        setSelected(previous);
        applyThemeToShell(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Tema kaydedildi.");
    });
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontSize: "14px",
            fontWeight: 600,
          },
          success: {
            iconTheme: { primary: "var(--success)", secondary: "var(--surface)" },
          },
          error: {
            iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" },
          },
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const isSelected = selected === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(theme.id)}
              className={`
                relative text-left rounded-2xl p-4 transition-all duration-200
                bg-[var(--surface)] border-2
                ${isSelected ? "border-[var(--ring)] shadow-md" : "border-[var(--border)] hover:border-[var(--ring)]/50"}
                ${isPending ? "opacity-70 cursor-wait" : "cursor-pointer"}
              `}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <Check className="w-3 h-3 text-[var(--text-primary)]" strokeWidth={3} />
                </span>
              )}

              <div className="flex gap-1.5 mb-3">
                <span
                  className="w-8 h-8 rounded-lg border border-black/5"
                  style={{ backgroundColor: theme.preview.bg }}
                />
                <span
                  className="w-8 h-8 rounded-lg border border-black/5"
                  style={{ backgroundColor: theme.preview.surface }}
                />
                <span
                  className="w-8 h-8 rounded-lg border border-black/5"
                  style={{ backgroundColor: theme.preview.primary }}
                />
              </div>

              <p className="text-[var(--text-primary)] font-semibold text-sm">
                {theme.label}
              </p>
              <p className="text-[var(--text-secondary)] text-xs mt-1">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>
    </>
  );
}
