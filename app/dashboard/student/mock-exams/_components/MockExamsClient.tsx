"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileBarChart2,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PdfReportHeader from "@/app/dashboard/_components/PdfReportHeader";
import { PDF_EXPORT_BG } from "@/lib/pdf-export-constants";
import MockExamForm from "./MockExamForm";
import MockExamChart from "./MockExamChart";
import MockExamsList from "./MockExamsList";

// ─── Types (paylasilan) ───────────────────────────────────────────────────────
export interface ExamOption {
  id: number;
  name: string;
  description: string | null;
}

export interface SubjectOption {
  id: number;
  name: string;
  exam_id: number | null;
  order_index: number;
  color: string | null;
  exam: { name: string } | null;
}

export interface MockExamResultRow {
  id: number;
  subject_id: number;
  correct_count: number;
  wrong_count: number;
  empty_count: number;
  net: number | null;
  subject: { id: number; name: string; color: string | null } | null;
}

export interface MockExamWithResults {
  id: number;
  exam_date: string;
  title: string | null;
  publisher: string | null;
  total_questions: number | null;
  exam: { id: number; name: string } | null;
  results: MockExamResultRow[];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastState = { type: "success" | "error"; message: string };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose, toast]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === "success"
          ? "bg-[#0d1f0d] border-green-500/30 text-green-400 shadow-green-500/10"
          : "bg-[#1f0d0d] border-red-500/30 text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="w-4.5 h-4.5 shrink-0" />
      ) : (
        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  glow,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down" | "flat";
  glow: string;
}) {
  return (
    <div
      className="relative rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-md p-5 overflow-hidden group hover:border-white/15 transition-all duration-300"
    >
      <div
        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[50px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glow }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[11px] font-semibold uppercase tracking-wider mb-2">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-white text-3xl font-black tabular-nums">{value}</p>
            {trend && (
              <span
                className={`flex items-center gap-0.5 text-xs font-bold ${
                  trend === "up"
                    ? "text-green-400"
                    : trend === "down"
                    ? "text-red-400"
                    : "text-white/30"
                }`}
              >
                {trend === "up" ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : trend === "down" ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
          <p className="text-white/30 text-xs mt-1">{sub}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl border border-white/10 bg-white/4 flex items-center justify-center shrink-0 text-white/70"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function totalNetFor(mockExam: MockExamWithResults): number {
  return mockExam.results.reduce((sum, r) => sum + Number(r.net ?? 0), 0);
}

// ─── Client ───────────────────────────────────────────────────────────────────
interface Props {
  initialMockExams: MockExamWithResults[];
  exams: ExamOption[];
  subjects: SubjectOption[];
}

export default function MockExamsClient({
  initialMockExams,
  exams,
  subjects,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [mockExams, setMockExams] = useState<MockExamWithResults[]>(initialMockExams);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Yeni deneme eklendikten sonra listeyi yenile
  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("mock_exams")
      .select(
        `id, exam_date, title, publisher, total_questions,
         exam:exams(id, name),
         results:mock_exam_results(
           id, subject_id, correct_count, wrong_count, empty_count, net,
           subject:subjects(id, name, color)
         )`
      )
      .eq("student_id", user.id)
      .order("exam_date", { ascending: false })
      .limit(50);

    if (data) {
      setMockExams(data as unknown as MockExamWithResults[]);
      router.refresh();
    }
  }, [supabase, router]);

  // Silme
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("mock_exams").delete().eq("id", id);
    if (error) {
      setToast({ type: "error", message: "Silme başarısız: " + error.message });
      return;
    }
    setMockExams((prev) => prev.filter((m) => m.id !== id));
    setToast({ type: "success", message: "Deneme silindi." });
    router.refresh();
  };

  // ─── Istatistikler ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const sorted = [...mockExams].sort(
      (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    );
    const total = sorted.length;
    const lastNet = total > 0 ? totalNetFor(sorted[total - 1]) : 0;
    const prevNet = total > 1 ? totalNetFor(sorted[total - 2]) : null;
    const diff = prevNet !== null ? lastNet - prevNet : 0;
    const trend: "up" | "down" | "flat" =
      prevNet === null
        ? "flat"
        : diff > 0.01
        ? "up"
        : diff < -0.01
        ? "down"
        : "flat";

    return {
      total,
      lastNet: lastNet.toFixed(2),
      diff: diff.toFixed(2),
      trend,
    };
  }, [mockExams]);

  // ─── Chart icin veri ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return [...mockExams]
      .sort(
        (a, b) =>
          new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
      )
      .map((m) => ({
        id: m.id,
        date: new Date(m.exam_date).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        }),
        fullDate: m.exam_date,
        examName: m.exam?.name ?? "—",
        title: m.title ?? "Deneme",
        net: Number(totalNetFor(m).toFixed(2)),
      }));
  }, [mockExams]);

  return (
    <>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ── PDF yakalama alani: ozet kartlar + grafik ───────────────────── */}
      <div
        id="mock-exams-export-root"
        className="space-y-4 rounded-2xl p-4 sm:p-5"
        style={{ backgroundColor: PDF_EXPORT_BG }}
      >
        <PdfReportHeader subtitle="Deneme Analizi Raporu" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<FileBarChart2 className="w-5 h-5" />}
            label="Girilen Toplam Deneme"
            value={stats.total > 0 ? String(stats.total) : "—"}
            sub="Tüm zamanlar"
            glow="rgba(123,47,255,0.25)"
          />
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label="Son Deneme Neti"
            value={stats.total > 0 ? stats.lastNet : "—"}
            sub={
              stats.total > 0
                ? `Toplam net (${chartData[chartData.length - 1]?.examName ?? ""})`
                : "Henüz deneme girilmedi"
            }
            glow="rgba(79,124,255,0.25)"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Net Artış Trendi"
            value={
              stats.trend === "flat" && stats.total < 2
                ? "—"
                : `${parseFloat(stats.diff) >= 0 ? "+" : ""}${stats.diff}`
            }
            sub={
              stats.trend === "up"
                ? "Bir önceki denemeye göre artış"
                : stats.trend === "down"
                ? "Bir önceki denemeye göre azalış"
                : "Karşılaştırma için en az 2 deneme gerek"
            }
            trend={stats.trend}
            glow="rgba(0,212,255,0.25)"
          />
        </div>

        <MockExamChart data={chartData} />
      </div>

      {/* ── Form (PDF disinda) ─────────────────────────────────────────── */}
      <div className="pdf-export-hide print-hidden max-w-xl">
        <MockExamForm
          exams={exams}
          subjects={subjects}
          onSuccess={(message) => {
            setToast({ type: "success", message });
            refresh();
          }}
          onError={(message) => setToast({ type: "error", message })}
        />
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      <MockExamsList mockExams={mockExams} onDelete={handleDelete} />
    </>
  );
}
