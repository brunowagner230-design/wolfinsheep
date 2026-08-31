-- Grant admin to the fixed owner email if the account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'brunowagner230@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure the owner becomes admin automatically on signup
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'brunowagner230@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_owner_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_owner_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.claim_first_admin();
