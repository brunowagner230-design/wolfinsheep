ALTER TABLE public.betting_houses ADD COLUMN IF NOT EXISTS default_cpa numeric NOT NULL DEFAULT 0;

UPDATE public.betting_houses SET default_cpa = 60 WHERE name = 'ApostaGanha Mensal';
UPDATE public.betting_houses SET default_cpa = 200 WHERE name = 'SuperBet Mensal';
UPDATE public.betting_houses SET default_cpa = 60 WHERE name = 'Betano Diaria';
UPDATE public.betting_houses SET default_cpa = 100 WHERE name = 'SuperBet Diaria';