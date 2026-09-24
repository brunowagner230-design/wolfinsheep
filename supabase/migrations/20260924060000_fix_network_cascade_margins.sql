-- Ajusta a cascata para calcular a margem de cada upline em cada nível.
-- Regra: a comissão de um nível é a diferença entre o CPA que o upline recebe
-- e o CPA que ele repassou ao afiliado imediatamente abaixo dele.

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT
      p.id,
      p.full_name,
      p.email,
      1 AS lvl,
      p.referred_by AS parent_id
    FROM public.profiles p
    WHERE p.referred_by = _user_id

    UNION ALL

    SELECT
      c.id,
      c.full_name,
      c.email,
      t.lvl + 1,
      c.referred_by AS parent_id
    FROM public.profiles c
    JOIN tree t ON c.referred_by = t.id
    WHERE t.lvl < 3
  ),
  per_deal AS (
    SELECT
      t.lvl,
      t.id AS affiliate_id,
      t.full_name,
      t.email,
      COALESCE(d.eligible_cpa, 0)::integer AS cpas,
      COALESCE(d.eligible_cpa * d.cpa_amount, 0)::numeric AS gross,
      COALESCE(d.eligible_cpa, 0) * GREATEST(
        GREATEST(
          COALESCE((
            SELECT MAX(ad.cpa_amount)
            FROM public.affiliate_deals ad
            WHERE ad.affiliate_id = t.parent_id
              AND ad.house_id IS NOT DISTINCT FROM d.house_id
          ), 0),
          COALESCE((
            SELECT MAX(np.cpa_amount)
            FROM public.network_plans np
            WHERE np.downline_id = t.parent_id
              AND np.house_id IS NOT DISTINCT FROM d.house_id
          ), 0)
        )
        - COALESCE((
          SELECT MAX(np.cpa_amount)
          FROM public.network_plans np
          WHERE np.upline_id = t.parent_id
            AND np.downline_id = t.id
            AND np.house_id IS NOT DISTINCT FROM d.house_id
        ), 0),
        0
      )::numeric AS commission
    FROM tree t
    LEFT JOIN public.affiliate_deals d ON d.affiliate_id = t.id
  )
  SELECT
    p.lvl,
    p.affiliate_id,
    p.full_name,
    p.email,
    COALESCE(SUM(p.cpas), 0)::integer,
    COALESCE(SUM(p.gross), 0)::numeric,
    ROUND(COALESCE(SUM(p.commission), 0), 2)::numeric
  FROM per_deal p
  GROUP BY p.lvl, p.affiliate_id, p.full_name, p.email
  ORDER BY p.lvl, p.full_name;
END
$function$;

GRANT EXECUTE ON FUNCTION public.cascade_network(uuid) TO authenticated;
