import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { PsychologicalTest, TestType } from "@/lib/tests";
import TestRunner from "./_components/TestRunner";

export const dynamic = "force-dynamic";

export default async function StudentTestRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testId = Number(id);
  if (!Number.isFinite(testId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: rawTest } = await supabase
    .from("psychological_tests")
    .select("id, title, description, type, questions, is_active, created_at")
    .eq("id", testId)
    .maybeSingle();

  if (!rawTest || !rawTest.is_active) notFound();
  const test = rawTest as unknown as PsychologicalTest;

  // Önceki sonuç (varsa) — kullanıcıya "bir kez daha çözüyorsun" göstergesi için
  const { data: rawLatest } = await supabase
    .from("test_results")
    .select("id, score, interpretation, taken_at")
    .eq("student_id", user.id)
    .eq("test_id", testId)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/dashboard/student/tests"
        className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tüm testler
      </Link>

      <TestRunner
        test={test}
        testType={test.type as TestType}
        previousResult={
          rawLatest
            ? {
                score: rawLatest.score,
                interpretation: rawLatest.interpretation,
                taken_at: rawLatest.taken_at,
              }
            : null
        }
      />
    </div>
  );
}
