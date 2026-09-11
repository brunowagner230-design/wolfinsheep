ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS house_id uuid REFERENCES public.betting_houses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS withdrawals_house_id_idx ON public.withdrawals (house_id);