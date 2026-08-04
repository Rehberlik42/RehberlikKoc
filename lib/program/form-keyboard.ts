/** Form / panel klavye akışı — AddTaskModal, BatchComposer, grid */

export function isModKey(e: {
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return e.metaKey || e.ctrlKey;
}

export function isTextareaTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    const t = target.type;
    return (
      t === "text" ||
      t === "search" ||
      t === "url" ||
      t === "email" ||
      t === "number" ||
      t === "password" ||
      t === "tel" ||
      t === ""
    );
  }
  return false;
}

/**
 * Global kısayollar (N vb.) metin alanlarında / contenteditable içinde tetiklenmesin.
 * input, textarea, select ve contenteditable kapsar.
 */
export function shouldIgnoreGlobalShortcut(
  target: EventTarget | null
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (
    target.closest(
      "input, textarea, select, [contenteditable='true'], [contenteditable='']"
    )
  ) {
    return true;
  }
  return false;
}

/** Açık listbox / combobox varken Enter'ı o bileşene bırak */
export function isOpenListboxContext(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[role="listbox"]')) return true;
  const expanded = target.closest('[aria-expanded="true"]');
  return expanded != null;
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => {
      if (el.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      return el.getClientRects().length > 0;
    }
  );
}

/** Enter ile bir sonraki etkileşimli alana odaklan */
export function focusNextField(
  container: HTMLElement,
  current: HTMLElement
): boolean {
  const focusables = getFocusableElements(container);
  const idx = focusables.indexOf(current);
  if (idx === -1) return false;
  const next = focusables[idx + 1];
  if (!next) return false;
  next.focus();
  return true;
}

/** macOS’ta ⌘, diğerlerinde Ctrl */
export function modKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS/i.test(ua)) {
    return "⌘";
  }
  return "Ctrl";
}
