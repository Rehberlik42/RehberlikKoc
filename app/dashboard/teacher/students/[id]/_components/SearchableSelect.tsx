"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

export interface SearchableSelectProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  emptyText?: string;
}

function trLower(s: string) {
  return s.toLocaleLowerCase("tr-TR");
}

export default function SearchableSelect({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder = "— Seçin —",
  disabled = false,
  searchable = true,
  emptyText = "Sonuç yok",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = trLower(search.trim());
    return options.filter(
      (o) =>
        trLower(o.label).includes(q) ||
        (o.hint != null && trLower(o.hint).includes(q))
    );
  }, [options, search, searchable]);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlightIndex(0);
  }, []);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      close();
    },
    [onChange, close]
  );

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) =>
          filteredOptions.length === 0 ? 0 : Math.min(i + 1, filteredOptions.length - 1)
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && filteredOptions.length > 0) {
        e.preventDefault();
        const opt = filteredOptions[highlightIndex];
        if (opt) select(opt.value);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close, filteredOptions, highlightIndex, select]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, searchable]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  const displayLabel = selectedOption
    ? selectedOption.hint
      ? `[${selectedOption.hint}] ${selectedOption.label}`
      : selectedOption.label
    : placeholder;

  return (
    <div
      className={`flex flex-col gap-1.5 transition-opacity duration-300 ${
        disabled ? "opacity-50" : "opacity-100"
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
        {icon}
        {label}
      </span>

      <div ref={containerRef} className={`relative ${open ? "z-50" : ""}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed ${
            value
              ? "border-white/15 bg-white/[0.06] text-white"
              : "border-white/8 bg-white/[0.04] text-white/50"
          } ${open ? "ring-2 ring-[#7B2FFF]/40" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown
            className={`ml-2 h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d2b] shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200">
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-white/8 bg-[#0d0d2b] p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ara..."
                    className="w-full rounded-lg border border-white/8 bg-[#07071a] py-2 pl-8 pr-3 text-sm text-white placeholder-white/25 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#7B2FFF]/40"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-white/35">
                  {emptyText}
                </li>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = index === highlightIndex;

                  return (
                    <li key={opt.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => select(opt.value)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-[#7B2FFF]/15 text-[#A78BFF]"
                            : isHighlighted
                              ? "bg-white/8 text-white"
                              : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {opt.label}
                          {opt.hint && (
                            <span className="ml-1.5 text-xs text-white/35">
                              [{opt.hint}]
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-[#A78BFF]" />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
