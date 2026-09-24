-- Simple admin-controlled Superbet withdrawal switch.
alter table public.betting_houses
  add column if not exists withdrawals_enabled boolean not null default false;

create or replace function public.enforce_affiliate_withdrawal_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_name text;
  v_enabled boolean;
begin
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if new.house_id is null then
    raise exception 'Saques sem casa vinculada não são permitidos.';
  end if;

  select name, withdrawals_enabled
    into v_house_name, v_enabled
  from public.betting_houses
  where id = new.house_id;

  if v_house_name is null or lower(v_house_name) not like '%superbet%' then
    raise exception 'No momento, os saques estão disponíveis somente para a Superbet.';
  end if;

  if coalesce(v_enabled, false) = false then
    raise exception 'Os saques da Superbet estão temporariamente bloqueados pela administração.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_affiliate_withdrawal_policy on public.withdrawals;

create trigger enforce_affiliate_withdrawal_policy
before insert on public.withdrawals
for each row
execute function public.enforce_affiliate_withdrawal_policy();
