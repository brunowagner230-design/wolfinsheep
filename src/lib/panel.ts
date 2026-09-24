export type DealRow = {
  id: string;
  affiliate_id: string;
  house_id: string | null;
  deal_name: string;
  cpa_plan: string;
  cpa_amount: number | string;
  baseline: string;
  eligible_cpa: number;
  clicks: number;
  registrations: number;
  status: string;
  notes: string | null;
  created_at: string;
  betting_houses?: { name: string; withdrawals_enabled?: boolean } | null;
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
  promo_link: string;
  approved: boolean;
};

export type HouseRow = {
  id: string;
  name: string;
  country: string;
  logo_url: string | null;
  default_cpa?: number | string | null;
  is_active?: boolean;
  withdrawals_enabled?: boolean;
  pause_message?: string | null;
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

export type WithdrawalRow = {
  id: string;
  user_id: string;
  amount: number | string;
  pix_key: string;
  pix_key_type: string;
  holder_name: string;
  status: string;
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
};

export type SupportTicketRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string } | null;
};

export type SupportMessageRow = {
  id: string;
  ticket_id: string;
  sender: string;
  author_id: string | null;
  body: string;
  created_at: string;
};
