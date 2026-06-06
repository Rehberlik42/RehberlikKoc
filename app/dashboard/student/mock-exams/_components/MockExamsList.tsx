"use client";

import { useState } from "react";
import {
  History,
  CalendarDays,
  Building2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import type { MockExamWithResults } from "./MockExamsClient";

interface Props {
  mockExams: MockExamWithResults[];
  onDelete: (id: number) => void;
}

function totalNet(m: MockExamWithResults): number {
  return m.results.reduce((s, r) => s + Number(r.net ?? 0), 0);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Single Row ───────────────────────────────────────────────────────────────
function MockExamRow({
  m,
  onDelete,
}: {
  m: MockExamWithResults;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const net = totalNet(m);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d2b]/40 backdrop-blur-sm transition-all duration-300 hover:border-white/15">
      {/* Header satiri */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Net badge */}
        <div
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border transition-shadow duration-300 ${
            net >= 0
              ? "border-[#7B2FFF]/30 bg-gradient-to-br from-[#7B2FFF]/20 to-[#4F7CFF]/15 shadow-[0_0_14px_rgba(123,47,255,0.2)]"
              : "border-red-500/30 bg-red-500/10 shadow-[0_0_14px_rgba(239,68,68,0.15)]"
          }`}
        >
          <span
            className={`text-lg font-black tabular-nums leading-none ${
              net >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {net.toFixed(1)}
          </span>
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mt-0.5">
            net
          </span>
        </div>

        {/* Detay */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#7B2FFF]/20 text-[#A78BFF] border border-[#7B2FFF]/25">
              {m.exam?.name ?? "—"}
            </span>
            {m.title && (
              <span className="text-white font-semibold text-sm truncate">
                {m.title}
              </span>
            )}
            {!m.title && (
              <span className="text-white/40 text-sm italic">
                İsimsiz deneme
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/40 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(m.exam_date)}
            </span>
            {m.publisher && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {m.publisher}
              </span>
            )}
            {m.total_questions != null && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {m.total_questions} soru
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Detayları göster"
          >
            {open ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {confirm ? (
            <div className="flex items-center gap-1 animate-in fade-in duration-200 fill-mode-both">
              <button
                type="button"
                onClick={() => {
                  onDelete(m.id);
                  setConfirm(false);
                }}
                className="rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300 transition-all hover:bg-red-500/25"
              >
                Eminim
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40 transition-all hover:bg-white/[0.08]"
              >
                İptal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Detay (collapsible) */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/5 bg-black/15 px-5 py-4">
            {m.results.length === 0 ? (
              <p className="text-xs italic text-white/30">
                Bu deneme için ders detayı bulunmuyor.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {m.results
                  .slice()
                  .sort((a, b) => {
                    const an = Number(a.net ?? 0);
                    const bn = Number(b.net ?? 0);
                    return bn - an;
                  })
                  .map((r) => {
                    const subjectNet = Number(r.net ?? 0);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                      >
                        <span
                          className="h-7 w-1 shrink-0 rounded-full"
                          style={{
                            background: r.subject?.color ?? "#4F7CFF",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">
                            {r.subject?.name ?? "—"}
                          </p>
                          <p className="text-[10px] text-white/30">
                            {r.correct_count}D · {r.wrong_count}Y ·{" "}
                            {r.empty_count}B
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-black tabular-nums ${
                            subjectNet >= 0 ? "text-white" : "text-red-400"
                          }`}
                        >
                          {subjectNet >= 0 ? "+" : ""}
                          {subjectNet.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────
export default function MockExamsList({ mockExams, onDelete }: Props) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20 border border-[#7B2FFF]/20 flex items-center justify-center">
          <History className="w-4 h-4 text-[#A78BFF]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm">Geçmiş Denemelerim</h3>
          <p className="text-white/30 text-[11px]">
            En yeniden eskiye doğru sıralı
          </p>
        </div>
        {mockExams.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 py-1 rounded-md bg-white/4 border border-white/8">
            {mockExams.length} kayıt
          </span>
        )}
      </div>

      <div className="p-5">
        {mockExams.length === 0 ? (
          <div className="rounded-xl border border-white/8 border-dashed bg-white/2 px-4 py-10 text-center">
            <p className="text-white/50 text-sm font-semibold mb-1">
              Henüz deneme kaydedilmedi
            </p>
            <p className="text-white/30 text-xs">
              Yukarıdaki formdan ilk denemeni eklediğinde burada listelenir.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockExams.map((m, idx) => (
              <div
                key={m.id}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300"
                style={{ animationDelay: `${Math.min(idx * 50, 350)}ms` }}
              >
                <MockExamRow m={m} onDelete={onDelete} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
