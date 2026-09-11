CREATE TABLE public.cascade_settings (
  level integer PRIMARY KEY,
  percent numeric NOT NULL DEFAULT 0
);
GRANT SELECT ON public.cascade_settings TO authenticated;
GRANT ALL ON public.cascade_settings TO service_role;
ALTER TABLE public.cascade_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cascade settings readable" ON public.cascade_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage cascade settings" ON public.cascade_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
INSERT INTO public.cascade_settings (level, percent) VALUES (1, 10), (2, 5), (3, 2);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_cpa_validated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE diff integer;
BEGIN
  diff := new.eligible_cpa - COALESCE(old.eligible_cpa, 0);
  IF diff > 0 THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (
      new.affiliate_id,
      'CPA validado!',
      format('%s CPA validado(s) no acordo %s. Comissao liberada na sua carteira.', diff, COALESCE(NULLIF(new.deal_name, ''), 'CPA')),
      'cpa'
    );
  END IF;
  RETURN new;
END $$;

CREATE TRIGGER trg_notify_cpa_validated
AFTER INSERT OR UPDATE OF eligible_cpa ON public.affiliate_deals
FOR EACH ROW EXECUTE FUNCTION public.notify_cpa_validated();

CREATE OR REPLACE FUNCTION public.notify_withdrawal_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.status IS DISTINCT FROM old.status THEN
    IF new.status = 'aprovado' THEN
      INSERT INTO public.notifications (user_id, title, body, kind)
      VALUES (new.user_id, 'Saque pago!', format('Seu saque de R$ %s foi aprovado e pago via Pix.', to_char(new.amount, 'FM999G999G999D00')), 'saque');
    ELSIF new.status = 'rejeitado' THEN
      INSERT INTO public.notifications (user_id, title, body, kind)
      VALUES (new.user_id, 'Saque rejeitado', format('Seu saque de R$ %s foi rejeitado. %s', to_char(new.amount, 'FM999G999G999D00'), COALESCE(new.admin_note, '')), 'saque');
    END IF;
  END IF;
  RETURN new;
END $$;

CREATE TRIGGER trg_notify_withdrawal_status
AFTER UPDATE OF status ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();

CREATE OR REPLACE FUNCTION public.cascade_network(_user_id uuid)
RETURNS TABLE (
  level integer,
  affiliate_id uuid,
  affiliate_name text,
  affiliate_email text,
  cpas integer,
  gross numeric,
  commission numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, p.full_name, p.email, 1 AS lvl
    FROM profiles p WHERE p.referred_by = _user_id
    UNION ALL
    SELECT c.id, c.full_name, c.email, t.lvl + 1
    FROM profiles c JOIN tree t ON c.referred_by = t.id
    WHERE t.lvl < 3
  ), agg AS (
    SELECT t.lvl, t.id, t.full_name, t.email,
      COALESCE(SUM(d.eligible_cpa), 0)::integer AS cpas,
      COALESCE(SUM(d.eligible_cpa * d.cpa_amount), 0)::numeric AS gross
    FROM tree t
    LEFT JOIN affiliate_deals d ON d.affiliate_id = t.id
    GROUP BY t.lvl, t.id, t.full_name, t.email
  )
  SELECT a.lvl, a.id, a.full_name, a.email, a.cpas, a.gross,
    ROUND(a.gross * COALESCE(cs.percent, 0) / 100, 2)
  FROM agg a
  LEFT JOIN cascade_settings cs ON cs.level = a.lvl
  ORDER BY a.lvl, a.full_name;
END $$;

GRANT EXECUTE ON FUNCTION public.cascade_network(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;