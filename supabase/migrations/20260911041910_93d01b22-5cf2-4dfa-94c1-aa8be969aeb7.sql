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
    SELECT COALESCE(MAX(cpa_amount), 0)::numeric AS cap
    FROM affiliate_deals WHERE affiliate_id = _user_id
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