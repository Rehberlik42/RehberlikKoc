-- Tema tercihi: night (varsayılan), cream-gold, cream-emerald, vanilla-navy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'night';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_theme_check
  CHECK (theme IN ('night', 'cream-gold', 'cream-emerald', 'vanilla-navy'));

COMMENT ON COLUMN public.profiles.theme IS 'Dashboard görünüm teması';
