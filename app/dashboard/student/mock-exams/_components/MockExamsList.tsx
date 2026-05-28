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
    <div className="rounded-2xl border border-white/8 bg-[#0d0d2b]/40 backdrop-blur-sm hover:border-white/15 transition-all duration-200 overflow-hidden">
      {/* Header satiri */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Net badge */}
        <div
          className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
            net >= 0
              ? "bg-gradient-to-br from-[#7B2FFF]/20 to-[#4F7CFF]/15 border-[#7B2FFF]/30"
              : "bg-red-500/10 border-red-500/30"
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
            <>
              <button
                type="button"
                onClick={() => {
                  onDelete(m.id);
                  setConfirm(false);
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 transition-colors"
              >
                Eminim
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white/40 bg-white/4 border border-white/10 hover:bg-white/8 transition-colors"
              >
                İptal
              </button>
            </>
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
      {open && (
        <div className="border-t border-white/5 bg-black/15 px-5 py-4">
          {m.results.length === 0 ? (
            <p className="text-white/30 text-xs italic">
              Bu deneme için ders detayı bulunmuyor.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                      className="rounded-lg bg-white/3 border border-white/6 px-3 py-2 flex items-center gap-2"
                    >
                      <span
                        className="w-1 h-7 rounded-full shrink-0"
                        style={{
                          background: r.subject?.color ?? "#4F7CFF",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">
                          {r.subject?.name ?? "—"}
                        </p>
                        <p className="text-white/30 text-[10px]">
                          {r.correct_count}D · {r.wrong_count}Y · {r.empty_count}B
                        </p>
                      </div>
                      <span
                        className={`text-xs font-black tabular-nums shrink-0 ${
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
      )}
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
            {mockExams.map((m) => (
              <MockExamRow key={m.id} m={m} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
