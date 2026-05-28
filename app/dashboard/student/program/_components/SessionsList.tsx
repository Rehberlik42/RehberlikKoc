"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
  RefreshCw,
  ListChecks,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: number;
  study_date: string;
  correct_count: number;
  wrong_count: number;
  questions_solved: number;
  duration_minutes: number;
  notes: string | null;
  subject: { name: string } | null;
  topic: { name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcNet(correct: number, wrong: number) {
  return (correct - wrong / 4).toFixed(2);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Bugün";
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SessionsList({ refreshKey }: { refreshKey: number }) {
  const supabase = createClient();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("study_sessions")
      .select(
        `id, study_date, correct_count, wrong_count, questions_solved, duration_minutes, notes,
         subject:subjects(name),
         topic:topics(name)`
      )
      .eq("student_id", user.id)
      .order("study_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(25);

    // Supabase join sonucunu normalize et (dizi → tekil nesne)
    const normalized: Session[] = (data ?? []).map((row) => ({
      id: row.id,
      study_date: row.study_date,
      correct_count: row.correct_count,
      wrong_count: row.wrong_count,
      questions_solved: row.questions_solved,
      duration_minutes: row.duration_minutes,
      notes: row.notes,
      subject: Array.isArray(row.subject) ? row.subject[0] ?? null : row.subject,
      topic: Array.isArray(row.topic) ? row.topic[0] ?? null : row.topic,
    }));
    setSessions(normalized);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshKey]);

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d2b]/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F7CFF]/30 to-[#00D4FF]/10 border border-[#4F7CFF]/20 flex items-center justify-center">
            <ListChecks className="w-4 h-4 text-[#7AB3FF]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Son Çalışmalarım</h3>
            <p className="text-white/30 text-[11px]">
              En son {sessions.length} kayıt gösteriliyor
            </p>
          </div>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all"
          title="Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
          <BookOpen className="w-10 h-10 text-white/10" />
          <p className="text-white/40 text-sm">Henüz kayıtlı çalışma yok.</p>
          <p className="text-white/20 text-xs">
            Soldaki formu kullanarak ilk çalışmayı ekle!
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/30 text-[11px] uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-semibold">Tarih</th>
                  <th className="px-4 py-3 text-left font-semibold">Ders</th>
                  <th className="px-4 py-3 text-left font-semibold">Konu</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400/60" />D
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <span className="flex items-center justify-center gap-1">
                      <XCircle className="w-3 h-3 text-red-400/60" />Y
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">Net</th>
                  <th className="px-4 py-3 text-center font-semibold">
                    <span className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-[#7AB3FF]/60" />Süre
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const net = parseFloat(calcNet(s.correct_count, s.wrong_count));
                  return (
                    <tr
                      key={s.id}
                      className={`border-t border-white/4 hover:bg-white/2 transition-colors ${
                        i === 0 ? "border-t-0" : ""
                      }`}
                    >
                      <td className="px-6 py-3 text-white/50 text-xs whitespace-nowrap">
                        {formatDate(s.study_date)}
                      </td>
                      <td className="px-4 py-3 text-white font-medium text-xs max-w-[130px] truncate">
                        {s.subject?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs max-w-[130px] truncate">
                        {s.topic?.name ?? (
                          <Minus className="w-3 h-3 text-white/15 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 font-bold text-xs">
                        {s.correct_count}
                      </td>
                      <td className="px-4 py-3 text-center text-red-400 font-bold text-xs">
                        {s.wrong_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                            net >= 0
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {net >= 0 ? "+" : ""}
                          {net.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white/40 text-xs">
                        {s.duration_minutes > 0 ? `${s.duration_minutes}dk` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-white/4">
            {sessions.map((s) => {
              const net = parseFloat(calcNet(s.correct_count, s.wrong_count));
              return (
                <div key={s.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {s.subject?.name ?? "—"}
                      </p>
                      {s.topic && (
                        <p className="text-white/40 text-xs">{s.topic.name}</p>
                      )}
                    </div>
                    <span className="text-white/30 text-xs">{formatDate(s.study_date)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-400 font-bold">D: {s.correct_count}</span>
                    <span className="text-red-400 font-bold">Y: {s.wrong_count}</span>
                    <span
                      className={`font-black px-2 py-0.5 rounded-full ${
                        net >= 0
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      Net: {net >= 0 ? "+" : ""}
                      {net.toFixed(2)}
                    </span>
                    {s.duration_minutes > 0 && (
                      <span className="text-white/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.duration_minutes}dk
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
