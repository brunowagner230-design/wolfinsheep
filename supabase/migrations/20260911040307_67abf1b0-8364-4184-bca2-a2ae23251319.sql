REVOKE ALL ON FUNCTION public.notify_cpa_validated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_withdrawal_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cascade_network(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cascade_network(uuid) TO authenticated;