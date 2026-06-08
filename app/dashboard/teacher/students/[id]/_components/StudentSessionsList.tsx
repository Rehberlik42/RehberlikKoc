"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  ListChecks,
} from "lucide-react";

export interface StudentSessionRow {
  id: number;
  study_date: string;
  correct_count: number;
  wrong_count: number;
  duration_minutes: number;
  subject: { name: string; color: string | null } | null;
}

interface Props {
  sessions: StudentSessionRow[];
}

function calcNet(correct: number, wrong: number) {
  return correct - wrong / 4;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#4F7CFF]/25 bg-gradient-to-br from-[#4F7CFF]/20 to-[#00D4FF]/10">
        <ListChecks className="h-5 w-5 text-[#7AB3FF]" />
      </div>
      <p className="text-sm font-semibold text-white/60">
        Henüz çalışma oturumu yok
      </p>
      <p className="mt-1 max-w-xs text-xs text-white/30">
        Öğrenci programına kayıt ekledikçe son oturumlar burada listelenecek.
      </p>
    </div>
  );
}

export default function StudentSessionsList({ sessions }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#4F7CFF]/20 bg-gradient-to-br from-[#4F7CFF]/30 to-[#00D4FF]/20">
          <ListChecks className="h-4 w-4 text-[#7AB3FF]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Son Çalışma Oturumları</h3>
          <p className="text-[11px] text-white/30">
            En son {sessions.length > 0 ? sessions.length : 10} kayıt
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  <th className="px-5 py-3 text-left">Tarih</th>
                  <th className="px-4 py-3 text-left">Ders</th>
                  <th className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400/60" />
                      D
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-400/60" />
                      Y
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center">Net</th>
                  <th className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-[#7AB3FF]/60" />
                      Süre
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const net = calcNet(s.correct_count, s.wrong_count);
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-white/4 transition-colors hover:bg-white/[0.02] ${
                        i === 0 ? "border-t-0" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-white/50">
                        {formatDate(s.study_date)}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs font-medium text-white">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: s.subject?.color ?? "#7B2FFF",
                            }}
                          />
                          {s.subject?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-green-400">
                        {s.correct_count}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-red-400">
                        {s.wrong_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black ${
                            net >= 0
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {net >= 0 ? "+" : ""}
                          {net.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-white/40">
                        {s.duration_minutes > 0 ? `${s.duration_minutes} dk` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/4 md:hidden">
            {sessions.map((s) => {
              const net = calcNet(s.correct_count, s.wrong_count);
              return (
                <div key={s.id} className="space-y-2 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: s.subject?.color ?? "#7B2FFF",
                          }}
                        />
                        <span className="truncate">
                          {s.subject?.name ?? "—"}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-white/30">
                      {formatDate(s.study_date)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-bold text-green-400">
                      D: {s.correct_count}
                    </span>
                    <span className="font-bold text-red-400">
                      Y: {s.wrong_count}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-black ${
                        net >= 0
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      Net: {net >= 0 ? "+" : ""}
                      {net.toFixed(2)}
                    </span>
                    {s.duration_minutes > 0 && (
                      <span className="flex items-center gap-1 text-white/30">
                        <Clock className="h-3 w-3" />
                        {s.duration_minutes} dk
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
