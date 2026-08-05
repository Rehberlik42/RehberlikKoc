-- Günlük hedef birimi: görev sayısı (varsayılan) veya dakika
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_target_unit text NOT NULL DEFAULT 'task';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_target_tasks integer NOT NULL DEFAULT 5;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_daily_target_unit_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_daily_target_unit_check
    CHECK (daily_target_unit IN ('task', 'minute'));

COMMENT ON COLUMN public.profiles.daily_target_unit IS
  'Günlük hedef birimi: task (görev sayısı) veya minute (dakika)';
COMMENT ON COLUMN public.profiles.daily_target_tasks IS
  'Günlük hedef görev sayısı (unit=task iken kullanılır)';

-- Daha önce dakika hedefi tanımlı öğrenciler eski davranışta kalsın
UPDATE public.profiles
SET daily_target_unit = 'minute'
WHERE daily_target_minutes IS NOT NULL
  AND daily_target_minutes > 0
  AND daily_target_unit = 'task';
