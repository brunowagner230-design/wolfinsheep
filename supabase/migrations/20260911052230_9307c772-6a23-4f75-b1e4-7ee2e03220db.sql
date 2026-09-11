CREATE OR REPLACE FUNCTION public.notify_cpa_validated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  diff integer;
  cur_id uuid;
  up_id uuid;
  lvl integer := 0;
  cap numeric;
  passed numeric;
  margin numeric;
  down_name text;
BEGIN
  diff := new.eligible_cpa - COALESCE(old.eligible_cpa, 0);
  IF diff <= 0 THEN
    RETURN new;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (
    new.affiliate_id,
    'Nova comissão de CPA recebida',
    format('%s CPA validado(s) em %s. Comissão de %s liberada na sua carteira.', diff, COALESCE(NULLIF(new.deal_name, ''), 'CPA'), to_char(diff * new.cpa_amount, 'FM"R$ "999G999G999D00')),
    'cpa'
  );

  cur_id := new.affiliate_id;
  LOOP
    lvl := lvl + 1;
    EXIT WHEN lvl > 3;

    SELECT p.referred_by INTO up_id FROM public.profiles p WHERE p.id = cur_id;
    EXIT WHEN up_id IS NULL;

    SELECT COALESCE(MAX(d.cpa_amount), 0) INTO cap
    FROM public.affiliate_deals d WHERE d.affiliate_id = up_id;

    SELECT COALESCE(MAX(np.cpa_amount), 0) INTO passed
    FROM public.network_plans np
    WHERE np.upline_id = up_id AND np.downline_id = new.affiliate_id;

    margin := GREATEST(cap - passed, 0);

    IF margin > 0 THEN
      SELECT COALESCE(NULLIF(p.full_name, ''), p.email) INTO down_name
      FROM public.profiles p WHERE p.id = new.affiliate_id;

      INSERT INTO public.notifications (user_id, title, body, kind)
      VALUES (
        up_id,
        'Comissão de rede recebida',
        format('%s CPA validado(s) por %s (nível %s). Comissão de rede de %s liberada na sua carteira.', diff, COALESCE(down_name, 'seu afiliado'), lvl, to_char(diff * margin, 'FM"R$ "999G999G999D00')),
        'rede'
      );
    END IF;

    cur_id := up_id;
  END LOOP;

  RETURN new;
END $function$;