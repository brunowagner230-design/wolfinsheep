CREATE TABLE public.link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES public.betting_houses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente',
  promo_link text NOT NULL DEFAULT '',
  cpa_plan text NOT NULL DEFAULT '',
  cpa_amount numeric NOT NULL DEFAULT 0,
  baseline text NOT NULL DEFAULT '',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, house_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_requests TO authenticated;
GRANT ALL ON public.link_requests TO service_role;

ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own requests or admin" ON public.link_requests
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "create own requests" ON public.link_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pendente');

CREATE POLICY "admins manage requests" ON public.link_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_link_requests BEFORE UPDATE ON public.link_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_link_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE house_name text;
BEGIN
  IF new.status IS DISTINCT FROM old.status AND new.status = 'liberado' THEN
    SELECT name INTO house_name FROM public.betting_houses WHERE id = new.house_id;
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (
      new.user_id,
      'Link de divulgação liberado!',
      format('Seu link da %s está disponível no painel. Plano: %s.', COALESCE(house_name, 'casa'), COALESCE(NULLIF(new.cpa_plan, ''), 'CPA')),
      'link'
    );
  END IF;
  RETURN new;
END $function$;

REVOKE ALL ON FUNCTION public.notify_link_request_status() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_link_request AFTER UPDATE ON public.link_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_link_request_status();

CREATE OR REPLACE FUNCTION public.notify_cpa_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE diff integer;
BEGIN
  diff := new.eligible_cpa - COALESCE(old.eligible_cpa, 0);
  IF diff > 0 THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (
      new.affiliate_id,
      'Nova comissão de CPA recebida',
      format('%s CPA validado(s) em %s. Comissão de %s liberada na sua carteira.', diff, COALESCE(NULLIF(new.deal_name, ''), 'CPA'), to_char(diff * new.cpa_amount, 'FM"R$ "999G999G999D00')),
      'cpa'
    );
  END IF;
  RETURN new;
END $function$;

REVOKE ALL ON FUNCTION public.notify_cpa_validated() FROM PUBLIC, anon, authenticated;