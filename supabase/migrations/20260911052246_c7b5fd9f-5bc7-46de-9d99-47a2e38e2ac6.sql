REVOKE ALL ON FUNCTION public.notify_cpa_validated() FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.notify_link_request_status() FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.notify_withdrawal_status() FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated, anon;