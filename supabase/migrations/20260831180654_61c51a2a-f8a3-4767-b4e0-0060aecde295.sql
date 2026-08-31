-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'affiliate');

CREATE OR REPLACE FUNCTION public.gen_ref_code()
RETURNS TEXT LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL UNIQUE DEFAULT public.gen_ref_code(),
  referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "read own or downline or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR referred_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  upline UUID;
BEGIN
  SELECT p.id INTO upline FROM public.profiles p
  WHERE p.referral_code = upper(coalesce(NEW.raw_user_meta_data ->> 'ref_code', ''));

  INSERT INTO public.profiles (id, full_name, email, phone, referred_by)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', ''),
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data ->> 'phone', ''),
    upline
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'affiliate')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- houses
CREATE TABLE public.betting_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.betting_houses TO authenticated;
GRANT ALL ON public.betting_houses TO service_role;
ALTER TABLE public.betting_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "houses readable" ON public.betting_houses FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage houses" ON public.betting_houses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- affiliate deals
CREATE TABLE public.affiliate_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.betting_houses(id) ON DELETE SET NULL,
  deal_name TEXT NOT NULL DEFAULT '',
  cpa_plan TEXT NOT NULL DEFAULT '',
  cpa_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  baseline TEXT NOT NULL DEFAULT '',
  revshare NUMERIC(5,2) NOT NULL DEFAULT 0,
  eligible_cpa INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  registrations INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_deals TO authenticated;
GRANT ALL ON public.affiliate_deals TO service_role;
ALTER TABLE public.affiliate_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own deals or admin" ON public.affiliate_deals FOR SELECT TO authenticated
  USING (affiliate_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage deals" ON public.affiliate_deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- network plans
CREATE TABLE public.network_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upline_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downline_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  house_id UUID REFERENCES public.betting_houses(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL DEFAULT '',
  cpa_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  baseline TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (upline_id, downline_id, house_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.network_plans TO authenticated;
GRANT ALL ON public.network_plans TO service_role;
ALTER TABLE public.network_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "network plans visible" ON public.network_plans FOR SELECT TO authenticated
  USING (upline_id = auth.uid() OR downline_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "upline manages plans" ON public.network_plans FOR ALL TO authenticated
  USING (upline_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (upline_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_deals BEFORE UPDATE ON public.affiliate_deals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.betting_houses (name, country) VALUES
  ('Betano', 'BR'), ('Bet365', 'BR'), ('Superbet', 'BR'), ('KTO', 'BR'), ('Estrela Bet', 'BR');