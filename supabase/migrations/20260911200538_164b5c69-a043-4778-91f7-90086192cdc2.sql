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
  ), my_houses AS (
    SELECT ad.house_id FROM affiliate_deals ad WHERE ad.affiliate_id = _user_id
    UNION
    SELECT np.house_id FROM network_plans np WHERE np.downline_id = _user_id
  ), my_cap AS (
    SELECT h.house_id,
      GREATEST(
        COALESCE((SELECT MAX(ad.cpa_amount) FROM affiliate_deals ad
                  WHERE ad.affiliate_id = _user_id AND ad.house_id IS NOT DISTINCT FROM h.house_id), 0),
        COALESCE((SELECT MAX(np.cpa_amount) FROM network_plans np
                  WHERE np.downline_id = _user_id AND np.house_id IS NOT DISTINCT FROM h.house_id), 0)
      )::numeric AS cap
    FROM my_houses h
  ), passed AS (
    SELECT np.downline_id, np.house_id, MAX(np.cpa_amount)::numeric AS amt
    FROM network_plans np WHERE np.upline_id = _user_id
    GROUP BY np.downline_id, np.house_id
  ), per AS (
    SELECT t.lvl AS lvl, t.id AS aff_id, t.full_name AS aff_name, t.email AS aff_email,
      COALESCE(d.eligible_cpa, 0) AS n_cpas,
      COALESCE(d.eligible_cpa * d.cpa_amount, 0)::numeric AS gross_amt,
      COALESCE(d.eligible_cpa, 0) * GREATEST(
        COALESCE(mc.cap, (SELECT MAX(m2.cap) FROM my_cap m2), 0)
        - COALESCE(pa.amt, (SELECT MAX(pz.amt) FROM passed pz WHERE pz.downline_id = t.root_id), 0),
      0) AS comm
    FROM tree t
    LEFT JOIN affiliate_deals d ON d.affiliate_id = t.id
    LEFT JOIN my_cap mc ON mc.house_id IS NOT DISTINCT FROM d.house_id
    LEFT JOIN passed pa ON pa.downline_id = t.root_id AND pa.house_id IS NOT DISTINCT FROM d.house_id
  )
  SELECT p.lvl, p.aff_id, p.aff_name, p.aff_email,
    COALESCE(SUM(p.n_cpas), 0)::integer,
    COALESCE(SUM(p.gross_amt), 0)::numeric,
    ROUND(COALESCE(SUM(p.comm), 0), 2)
  FROM per p
  GROUP BY p.lvl, p.aff_id, p.aff_name, p.aff_email
  ORDER BY p.lvl, p.aff_name;
END $function$;