ALTER TABLE public.love_letters
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.love_letters.is_locked IS
  'When true, the letter cannot be deleted from the application until it is unlocked.';
