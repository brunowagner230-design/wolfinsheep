CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "manage own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS pushed_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_pending_push_idx ON public.notifications (created_at DESC) WHERE pushed_at IS NULL;