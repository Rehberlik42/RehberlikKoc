-- =============================================================================
-- Öğrenci kaynak ekleme: INSERT ... RETURNING için SELECT policy
-- =============================================================================
-- Sorun: study_resources_insert_student INSERT'e izin veriyordu ama
-- .select("id") / RETURNING için SELECT yoktu. Atama henüz yapılmadığı için
-- study_resources_select_assigned_student de yetmiyordu → RLS 42501.
-- =============================================================================

DROP POLICY IF EXISTS study_resources_select_student_created ON public.study_resources;

CREATE POLICY study_resources_select_student_created
  ON public.study_resources
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

COMMENT ON POLICY study_resources_select_student_created ON public.study_resources IS
  'Öğrenci created_by=self kaynakları okuyabilir; INSERT RETURNING ve kendi ekledikleri için gerekli.';

DROP POLICY IF EXISTS study_resource_topics_select_student_created ON public.study_resource_topics;

CREATE POLICY study_resource_topics_select_student_created
  ON public.study_resource_topics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.study_resources sr
      WHERE sr.id = study_resource_topics.resource_id
        AND sr.created_by = auth.uid()
    )
  );

COMMENT ON POLICY study_resource_topics_select_student_created ON public.study_resource_topics IS
  'Öğrenci kendi oluşturduğu kaynağın konularını okuyabilir.';
