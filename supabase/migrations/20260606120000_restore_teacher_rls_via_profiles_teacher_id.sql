-- =============================================================================
-- MINDORA: teacher_students kaldırıldıktan sonra öğretmen RLS politikaları
-- İlişki: profiles.teacher_id = auth.uid() AND profiles.role = 'student'
-- =============================================================================
-- Supabase SQL Editor'de veya: supabase db push / migration apply
-- =============================================================================

-- ─── Yardımcı fonksiyon ─────────────────────────────────────────────────────
-- Oturum açmış kullanıcı, verilen öğrenci profilinin öğretmeni mi?
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_student_id
      AND p.teacher_id = auth.uid()
      AND p.role = 'student'
  );
$$;

COMMENT ON FUNCTION public.is_teacher_of_student(uuid) IS
  'RLS: auth.uid() hedef öğrencinin profiles.teacher_id değerine eşit mi?';

-- ─── profiles ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_teacher ON public.profiles;

CREATE POLICY profiles_select_teacher
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND teacher_id = auth.uid()
  );

COMMENT ON POLICY profiles_select_teacher ON public.profiles IS
  'Öğretmen yalnızca teacher_id = kendi id olan öğrenci profillerini okuyabilir.';

-- ─── study_programs ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS study_programs_select_teacher ON public.study_programs;

CREATE POLICY study_programs_select_teacher
  ON public.study_programs
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(student_id));

COMMENT ON POLICY study_programs_select_teacher ON public.study_programs IS
  'Öğretmen, kendi öğrencisinin çalışma programını okuyabilir.';

-- ─── study_sessions ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS study_sessions_select_teacher ON public.study_sessions;

CREATE POLICY study_sessions_select_teacher
  ON public.study_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(student_id));

COMMENT ON POLICY study_sessions_select_teacher ON public.study_sessions IS
  'Öğretmen, kendi öğrencisinin çalışma oturumlarını okuyabilir.';

-- ─── topic_progress ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS topic_progress_select_teacher ON public.topic_progress;

CREATE POLICY topic_progress_select_teacher
  ON public.topic_progress
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(student_id));

COMMENT ON POLICY topic_progress_select_teacher ON public.topic_progress IS
  'Öğretmen, kendi öğrencisinin konu ilerlemesini okuyabilir.';

-- ─── mock_exams ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS mock_exams_select_teacher ON public.mock_exams;

CREATE POLICY mock_exams_select_teacher
  ON public.mock_exams
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(student_id));

COMMENT ON POLICY mock_exams_select_teacher ON public.mock_exams IS
  'Öğretmen, kendi öğrencisinin deneme sınavı kayıtlarını okuyabilir.';

-- ─── mock_exam_results ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS mock_exam_results_select_teacher ON public.mock_exam_results;

CREATE POLICY mock_exam_results_select_teacher
  ON public.mock_exam_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.mock_exams me
      WHERE me.id = mock_exam_results.mock_exam_id
        AND public.is_teacher_of_student(me.student_id)
    )
  );

COMMENT ON POLICY mock_exam_results_select_teacher ON public.mock_exam_results IS
  'Öğretmen, kendi öğrencisinin deneme sonuç satırlarını okuyabilir (mock_exams üzerinden).';

-- ─── test_results ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS test_results_select_teacher ON public.test_results;

CREATE POLICY test_results_select_teacher
  ON public.test_results
  FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_student(student_id));

COMMENT ON POLICY test_results_select_teacher ON public.test_results IS
  'Öğretmen, kendi öğrencisinin psikolojik test sonuçlarını okuyabilir.';

-- ─── appointments (INSERT) ──────────────────────────────────────────────────
DROP POLICY IF EXISTS appointments_insert_teacher ON public.appointments;

CREATE POLICY appointments_insert_teacher
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.is_teacher_of_student(student_id)
  );

COMMENT ON POLICY appointments_insert_teacher ON public.appointments IS
  'Öğretmen yalnızca kendi öğrencisi için randevu oluşturabilir (teacher_id = auth.uid()).';
