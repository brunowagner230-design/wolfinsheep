CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) IN ('brunowagner230@gmail.com', 'igamingkavalti@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "update own profile" ON public.profiles;
CREATE POLICY "update own or downline or admin"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR referred_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (id = auth.uid() OR referred_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX IF NOT EXISTS network_plans_unique_combo
ON public.network_plans (upline_id, downline_id, coalesce(house_id, '00000000-0000-0000-0000-000000000000'::uuid));