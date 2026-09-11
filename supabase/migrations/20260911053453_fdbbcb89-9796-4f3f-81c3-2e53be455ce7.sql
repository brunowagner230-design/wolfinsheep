CREATE OR REPLACE FUNCTION public.sync_deal_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  house_name text;
  touched integer := 0;
BEGIN
  IF NEW.cpa_amount IS NULL OR NEW.cpa_amount <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT name INTO house_name FROM public.betting_houses WHERE id = NEW.house_id;

  UPDATE public.affiliate_deals d
  SET cpa_amount = NEW.cpa_amount,
      deal_name = COALESCE(NULLIF(d.deal_name, ''), COALESCE(house_name, 'Acordo CPA'))
  WHERE d.affiliate_id = NEW.downline_id
    AND (d.house_id = NEW.house_id OR (NEW.house_id IS NULL AND d.house_id IS NULL));

  GET DIAGNOSTICS touched = ROW_COUNT;

  IF touched = 0 AND NEW.house_id IS NOT NULL THEN
    INSERT INTO public.affiliate_deals (affiliate_id, house_id, deal_name, cpa_amount)
    VALUES (NEW.downline_id, NEW.house_id, COALESCE(house_name, 'Acordo CPA'), NEW.cpa_amount);
  END IF;

  INSERT INTO public.notifications (user_id, title, body, kind)
  VALUES (
    NEW.downline_id,
    'Seu plano de CPA foi definido',
    format('Seu CPA em %s agora é %s.', COALESCE(house_name, 'sua casa'), to_char(NEW.cpa_amount, 'FM"R$ "999G999G999D00')),
    'cpa'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_deal_from_plan ON public.network_plans;
CREATE TRIGGER trg_sync_deal_from_plan
AFTER INSERT OR UPDATE OF cpa_amount ON public.network_plans
FOR EACH ROW EXECUTE FUNCTION public.sync_deal_from_plan();