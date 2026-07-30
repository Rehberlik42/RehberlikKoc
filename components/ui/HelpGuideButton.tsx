"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X } from "lucide-react";

export type HelpGuideSection = {
  heading: string;
  content: string | string[];
};

export type HelpGuideButtonProps = {
  title: string;
  sections: HelpGuideSection[];
  /** Opsiyonel ekstra sınıf — başlık satırına hizalamak için */
  className?: string;
};

function SectionBody({ content }: { content: string | string[] }) {
  if (Array.isArray(content)) {
    return (
      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[var(--text-secondary)]">
        {content.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return (
    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
      {content}
    </p>
  );
}

export default function HelpGuideButton({
  title,
  sections,
  className = "",
}: HelpGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const canPortal = typeof document !== "undefined";

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--primary)]/10 hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${className}`}
        aria-label={`${title} kullanım kılavuzu`}
        title="Kullanım Kılavuzu"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open &&
        canPortal &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
              type="button"
              aria-label="Modalı kapat"
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl sm:rounded-2xl"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10">
                    <HelpCircle className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                      Kullanım Kılavuzu
                    </p>
                    <h2
                      id={titleId}
                      className="truncate text-base font-bold text-[var(--text-primary)]"
                    >
                      {title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto px-5 py-4">
                {sections.map((section) => (
                  <section key={section.heading}>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {section.heading}
                    </h3>
                    <SectionBody content={section.content} />
                  </section>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
