DELETE FROM public.affiliate_deals WHERE house_id IN (SELECT id FROM public.betting_houses WHERE lower(name) LIKE '%superbet%diar%');
DELETE FROM public.link_requests WHERE house_id IN (SELECT id FROM public.betting_houses WHERE lower(name) LIKE '%superbet%diar%');
DELETE FROM public.network_plans WHERE house_id IN (SELECT id FROM public.betting_houses WHERE lower(name) LIKE '%superbet%diar%');
UPDATE public.withdrawals SET house_id = NULL WHERE house_id IN (SELECT id FROM public.betting_houses WHERE lower(name) LIKE '%superbet%diar%');
DELETE FROM public.betting_houses WHERE lower(name) LIKE '%superbet%diar%';