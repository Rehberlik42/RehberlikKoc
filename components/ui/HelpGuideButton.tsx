"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, HelpCircle, X } from "lucide-react";

export type HelpGuideSection = {
  heading: string;
  content: string | string[];
  /** true ise madde listesi numaralı (<ol>) render edilir */
  ordered?: boolean;
};

export type HelpGuideButtonProps = {
  title: string;
  sections: HelpGuideSection[];
  /** Opsiyonel ekstra sınıf — başlık satırına hizalamak için */
  className?: string;
};

function SectionBody({
  content,
  ordered,
}: {
  content: string | string[];
  ordered?: boolean;
}) {
  if (Array.isArray(content)) {
    const ListTag = ordered ? "ol" : "ul";
    const listCls = ordered
      ? "mt-1.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]"
      : "mt-1.5 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[var(--text-secondary)]";

    return (
      <ListTag className={listCls}>
        {content.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
      {content}
    </p>
  );
}

function buildInitialOpenMap(sections: HelpGuideSection[]) {
  const map: Record<string, boolean> = {};
  sections.forEach((section, index) => {
    map[section.heading] = index === 0;
  });
  return map;
}

export default function HelpGuideButton({
  title,
  sections,
  className = "h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]",
}: HelpGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => buildInitialOpenMap(sections)
  );
  const titleId = useId();
  const panelId = useId();
  const canPortal = typeof document !== "undefined";

  useEffect(() => {
    if (!open) return;
    setOpenSections(buildInitialOpenMap(sections));
  }, [open, sections]);

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

  const toggleSection = (heading: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 ${className}`}
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
              className="fixed inset-0 bg-black/50"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg sm:rounded-2xl"
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

              <div className="space-y-2 overflow-y-auto px-5 py-4">
                {sections.map((section, index) => {
                  const sectionOpen = Boolean(openSections[section.heading]);
                  const sectionPanelId = `${panelId}-section-${index}`;
                  return (
                    <section
                      key={section.heading}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40"
                    >
                      <h3 className="m-0">
                        <button
                          type="button"
                          aria-expanded={sectionOpen}
                          aria-controls={sectionPanelId}
                          onClick={() => toggleSection(section.heading)}
                          className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]/40"
                        >
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {section.heading}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 motion-reduce:transition-none ${
                              sectionOpen ? "rotate-180" : ""
                            }`}
                            aria-hidden
                          />
                        </button>
                      </h3>
                      {sectionOpen ? (
                        <div id={sectionPanelId} className="px-3.5 pb-3.5">
                          <SectionBody
                            content={section.content}
                            ordered={section.ordered}
                          />
                        </div>
                      ) : (
                        <div id={sectionPanelId} hidden />
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
