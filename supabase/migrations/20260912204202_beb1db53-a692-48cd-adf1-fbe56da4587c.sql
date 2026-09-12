DO $$
DECLARE bet_id uuid;
BEGIN
  SELECT id INTO bet_id FROM public.betting_houses WHERE name ILIKE 'Betano%' LIMIT 1;
  IF bet_id IS NULL THEN RETURN; END IF;

  -- preenche solicitações existentes sem link
  UPDATE public.link_requests lr
  SET promo_link = p.promo_link, status = 'liberado', updated_at = now()
  FROM public.profiles p
  WHERE p.id = lr.user_id
    AND lr.house_id = bet_id
    AND coalesce(lr.promo_link,'') = ''
    AND p.promo_link ILIKE '%kg-br%';

  -- cria solicitações liberadas para quem tem acordo Betano e link no perfil
  INSERT INTO public.link_requests (user_id, house_id, status, promo_link)
  SELECT DISTINCT d.affiliate_id, bet_id, 'liberado', p.promo_link
  FROM public.affiliate_deals d
  JOIN public.profiles p ON p.id = d.affiliate_id
  WHERE d.house_id = bet_id
    AND p.promo_link ILIKE '%kg-br%'
    AND NOT EXISTS (
      SELECT 1 FROM public.link_requests lr
      WHERE lr.user_id = d.affiliate_id AND lr.house_id = bet_id
        AND lr.status = 'liberado' AND coalesce(lr.promo_link,'') <> ''
    );
END $$;