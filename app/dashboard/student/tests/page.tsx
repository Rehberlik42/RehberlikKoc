import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Brain,
  Focus,
  Sparkles,
  Flame,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { typeMeta, type PsychologicalTest, type TestType } from "@/lib/tests";
import { timeAgo } from "@/lib/student-helpers";

export const dynamic = "force-dynamic";

interface TestRow {
  id: number;
  title: string;
  description: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
  questions: PsychologicalTest["questions"];
}

interface ResultLite {
  id: number;
  test_id: number;
  score: number | null;
  interpretation: string | null;
  taken_at: string;
}

export default async function StudentTestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: rawTests }, { data: rawResults }] = await Promise.all([
    supabase
      .from("psychological_tests")
      .select("id, title, description, type, is_active, created_at, questions")
      .eq("is_active", true)
      .order("id", { ascending: true }),
    supabase
      .from("test_results")
      .select("id, test_id, score, interpretation, taken_at")
      .eq("student_id", user.id)
      .order("taken_at", { ascending: false }),
  ]);

  const tests = (rawTests ?? []) as TestRow[];
  const results = (rawResults ?? []) as ResultLite[];

  // Her test için son sonuç (varsa)
  const latestByTest = new Map<number, ResultLite>();
  for (const r of results) {
    if (!latestByTest.has(r.test_id)) latestByTest.set(r.test_id, r);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/25 text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          DORA · Bütüncül değerlendirme
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <HeartPulse className="w-7 h-7 text-[var(--accent)]" />
          Testler ve Envanterler
        </h2>
        <p className="text-[var(--text-muted)] text-sm max-w-2xl">
          Kendini daha iyi tanı: kaygı, motivasyon ve çalışma düzeyini ölçen
          bilimsel testlerle kişisel rehberlik öneriler al.
        </p>
      </div>

      {/* DORA kartı */}
      <div className="relative rounded-2xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] p-5 overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-[80px] opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(123,47,255,0.5) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--accent)] shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[var(--text-primary)] text-sm font-semibold leading-relaxed">
              Bu testler kısa, dürüst yanıtlarla en doğru sonucu verir. Her
              sorudan sonra <span className="text-[var(--accent)]">ilk içgüdünle</span>{" "}
              ilerle — düşünmek için fazla zaman alma. Sonuçlar yalnızca sen ve
              koçun tarafından görülebilir.
            </p>
          </div>
        </div>
      </div>

      {/* Test grid */}
      {tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/30 p-12 text-center">
          <Activity className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
          <p className="text-[var(--text-secondary)] font-semibold">Henüz aktif test yok</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Admin tarafından yeni testler eklendiğinde burada görünecek.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tests.map((t) => {
            const latest = latestByTest.get(t.id);
            return (
              <TestCard
                key={t.id}
                test={t}
                lastResult={latest ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Test Card ────────────────────────────────────────────────────────────────
function TestCard({
  test,
  lastResult,
}: {
  test: TestRow;
  lastResult: ResultLite | null;
}) {
  const meta = typeMeta(test.type as TestType);
  const itemCount = test.questions?.items?.length ?? 0;
  const done = !!lastResult;
  const estimatedMin = Math.max(2, Math.round(itemCount * 0.25));

  const Icon = pickIcon(test.type as TestType);

  return (
    <Link
      href={`/dashboard/student/tests/${test.id}`}
      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-md p-5 overflow-hidden hover:border-[var(--border)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 block"
      style={
        {
          "--accent": meta.color,
        } as React.CSSProperties
      }
    >
      {/* glow */}
      <div
        aria-hidden
        className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-50 transition-opacity duration-500"
        style={{ background: meta.color }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div
          className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
          style={{
            background: `${meta.color}1a`,
            borderColor: `${meta.color}50`,
            color: meta.color,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
          style={{
            background: `${meta.color}14`,
            borderColor: `${meta.color}40`,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="relative text-[var(--text-primary)] text-base font-bold mt-3 leading-tight">
        {test.title}
      </h3>
      {test.description && (
        <p className="relative text-[var(--text-muted)] text-xs mt-1.5 leading-relaxed line-clamp-2">
          {test.description}
        </p>
      )}

      {/* Meta strip */}
      <div className="relative mt-3 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Flame className="w-3 h-3" />
          {itemCount} soru
        </span>
        <span className="inline-flex items-center gap-1">~{estimatedMin} dk</span>
      </div>

      {/* Footer: önceki sonuç (varsa) + CTA */}
      <div className="relative mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
        {done && lastResult ? (
          <div className="flex items-center gap-1.5 text-[11px] min-w-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[var(--text-muted)] truncate">
              {lastResult.interpretation ?? "Sonuç hazır"} ·{" "}
              <span className="text-[var(--text-muted)]">
                {timeAgo(lastResult.taken_at)}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-[11px] font-medium">
            Henüz çözmedin
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5"
          style={{ color: meta.color }}
        >
          {done ? "Tekrar Çöz" : "Başla"}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}

// ─── İkon seçimi (test type'a göre) ──────────────────────────────────────────
function pickIcon(type: TestType) {
  switch (type) {
    case "anxiety":
      return Activity;
    case "focus":
      return Focus;
    case "motivation":
      return Sparkles;
    case "burnout":
      return Flame;
    case "general":
    default:
      return Brain;
  }
}
