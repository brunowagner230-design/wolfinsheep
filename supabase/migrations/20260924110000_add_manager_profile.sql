-- Adiciona o perfil de gerente da operação.
-- Gerentes continuam sendo afiliados, mas podem definir o CPA dos próprios sub-afiliados.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);
CREATE INDEX IF NOT EXISTS profiles_is_manager_idx ON public.profiles (is_manager) WHERE is_manager = true;
