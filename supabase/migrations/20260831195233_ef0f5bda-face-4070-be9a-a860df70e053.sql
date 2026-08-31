ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promo_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

UPDATE public.profiles p SET approved = true
WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin');