alter table public.betting_houses
  add column if not exists is_active boolean not null default true,
  add column if not exists pause_message text;

update public.betting_houses
set is_active = true
where is_active is null;

comment on column public.betting_houses.is_active is 'Controls whether the operation is currently available to affiliates.';
comment on column public.betting_houses.pause_message is 'Optional message shown to affiliates when the operation is paused.';
