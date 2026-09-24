-- Affiliate withdrawal policy:
-- New affiliate withdrawals are restricted to Superbet and are enabled from
-- October 10, 2026 (Brazil/Sao Paulo time). Admin-created withdrawals remain
-- available for operational processing.

create or replace function public.enforce_affiliate_withdrawal_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  house_name text;
  is_admin boolean := false;
begin
  if auth.uid() is not null then
    begin
      is_admin := public.has_role(auth.uid(), 'admin');
    exception when undefined_function then
      is_admin := false;
    end;
  end if;

  if not is_admin then
    if new.house_id is null then
      raise exception 'Saques de afiliados devem estar vinculados à Superbet.';
    end if;

    select name into house_name
    from public.betting_houses
    where id = new.house_id;

    if coalesce(lower(house_name), '') not like '%superbet%' then
      raise exception 'No momento, somente saques da Superbet estão disponíveis.';
    end if;

    if (now() at time zone 'America/Sao_Paulo')::date < date '2026-10-10' then
      raise exception 'Os saques da Superbet serão liberados em 10/10/2026.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_affiliate_withdrawal_policy on public.withdrawals;

create trigger enforce_affiliate_withdrawal_policy
before insert on public.withdrawals
for each row
execute function public.enforce_affiliate_withdrawal_policy();
