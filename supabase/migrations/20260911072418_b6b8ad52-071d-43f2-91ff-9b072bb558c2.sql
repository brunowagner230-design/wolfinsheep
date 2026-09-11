CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own tickets or admin" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "create own tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_support_tickets BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'afiliado',
  author_id uuid,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_ticket_idx ON public.support_messages (ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read messages of own tickets or admin" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));
CREATE POLICY "write messages of own tickets or admin" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE OR REPLACE FUNCTION public.notify_support_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT t.user_id INTO owner_id FROM public.support_tickets t WHERE t.id = NEW.ticket_id;
  IF NEW.sender = 'suporte' AND owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, kind)
    VALUES (owner_id, 'Resposta do suporte', left(NEW.body, 240), 'suporte');
    UPDATE public.support_tickets SET status = 'respondido' WHERE id = NEW.ticket_id;
  ELSIF NEW.sender = 'afiliado' THEN
    UPDATE public.support_tickets SET status = 'aberto' WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_support_message AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_message();