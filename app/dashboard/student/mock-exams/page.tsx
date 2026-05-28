import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MockExamsClient, {
  type ExamOption,
  type SubjectOption,
  type MockExamWithResults,
} from "./_components/MockExamsClient";

export const dynamic = "force-dynamic";

export default async function MockExamsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Sinav turleri (YKS, LGS, KPSS, ARA_SINIF)
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, description")
    .eq("is_active", true)
    .order("id");

  // Tum dersler (form icin)
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, exam_id, order_index, color, exam:exams(name)")
    .order("exam_id")
    .order("order_index");

  // Ogrencinin gecmis denemeleri + sonuclari
  const { data: rawMockExams } = await supabase
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

  const mockExams = (rawMockExams ?? []) as unknown as MockExamWithResults[];
  const examOptions = (exams ?? []) as ExamOption[];
  const subjectOptions = (subjects ?? []) as unknown as SubjectOption[];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Deneme Sınavlarım ve Performans Analizim
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Her denemeyi kaydet, DORA senin için ilerlemeni grafiksel olarak izlesin.
        </p>
      </div>

      <MockExamsClient
        initialMockExams={mockExams}
        exams={examOptions}
        subjects={subjectOptions}
      />
    </div>
  );
}
