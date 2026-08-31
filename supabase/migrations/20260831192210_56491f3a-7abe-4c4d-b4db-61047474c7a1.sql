CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  pix_key text NOT NULL DEFAULT '',
  pix_key_type text NOT NULL DEFAULT 'cpf',
  holder_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente',
  admin_note text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own withdrawals or admin" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "create own withdrawals" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pendente');

CREATE POLICY "admins update withdrawals" ON public.withdrawals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cancel own pending withdrawals" ON public.withdrawals
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pendente');

CREATE TRIGGER touch_withdrawals BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();