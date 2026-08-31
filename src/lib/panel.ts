export type DealRow = {
  id: string;
  affiliate_id: string;
  house_id: string | null;
  deal_name: string;
  cpa_plan: string;
  cpa_amount: number | string;
  baseline: string;
  revshare: number | string;
  eligible_cpa: number;
  clicks: number;
  registrations: number;
  status: string;
  notes: string | null;
  created_at: string;
  betting_houses?: { name: string } | null;
  profiles?: { full_name: string; email: string } | null;
};

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

export type HouseRow = {
  id: string;
  name: string;
  country: string;
  logo_url: string | null;
};

export type NetworkPlanRow = {
  id: string;
  upline_id: string;
  downline_id: string;
  house_id: string | null;
  plan_name: string;
  cpa_amount: number | string;
  baseline: string;
  betting_houses?: { name: string } | null;
};

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );
