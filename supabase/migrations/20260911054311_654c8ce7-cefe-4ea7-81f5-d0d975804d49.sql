CREATE OR REPLACE FUNCTION public.cascade_network(_user_id uuid)
 RETURNS TABLE(level integer, affiliate_id uuid, affiliate_name text, affiliate_email text, cpas integer, gross numeric, commission numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT p.id, p.full_name, p.email, 1 AS lvl, p.id AS root_id
    FROM profiles p WHERE p.referred_by = _user_id
    UNION ALL
    SELECT c.id, c.full_name, c.email, t.lvl + 1, t.root_id
    FROM profiles c JOIN tree t ON c.referred_by = t.id
    WHERE t.lvl < 3
  ), my_cap AS (
    SELECT GREATEST(
      COALESCE((SELECT MAX(cpa_amount) FROM affiliate_deals WHERE affiliate_id = _user_id), 0),
      COALESCE((SELECT MAX(cpa_amount) FROM network_plans WHERE downline_id = _user_id), 0)
    )::numeric AS cap
  ), root_rate AS (
    SELECT np.downline_id, MAX(np.cpa_amount)::numeric AS amt
    FROM network_plans np WHERE np.upline_id = _user_id
    GROUP BY np.downline_id
  ), agg AS (
    SELECT t.lvl, t.id, t.full_name, t.email, t.root_id,
      COALESCE(SUM(d.eligible_cpa), 0)::integer AS cpas,
      COALESCE(SUM(d.eligible_cpa * d.cpa_amount), 0)::numeric AS gross
    FROM tree t
    LEFT JOIN affiliate_deals d ON d.affiliate_id = t.id
    GROUP BY t.lvl, t.id, t.full_name, t.email, t.root_id
  )
  SELECT a.lvl, a.id, a.full_name, a.email, a.cpas, a.gross,
    ROUND(a.cpas * GREATEST((SELECT cap FROM my_cap) - COALESCE(rr.amt, 0), 0), 2)
  FROM agg a
  LEFT JOIN root_rate rr ON rr.downline_id = a.root_id
  ORDER BY a.lvl, a.full_name;
END $function$;

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

    SELECT GREATEST(
      COALESCE((SELECT MAX(d.cpa_amount) FROM public.affiliate_deals d WHERE d.affiliate_id = up_id), 0),
      COALESCE((SELECT MAX(np.cpa_amount) FROM public.network_plans np WHERE np.downline_id = up_id), 0)
    ) INTO cap;

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