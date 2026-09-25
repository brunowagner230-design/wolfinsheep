-- Remove the Betano operation and every house-scoped record associated with it.
-- This migration is intentionally idempotent: running it again does nothing if Betano is gone.
DO $$
DECLARE
  house_ids uuid[];
  rec record;
BEGIN
  SELECT array_agg(id)
    INTO house_ids
  FROM public.betting_houses
  WHERE lower(name) = 'betano'
     OR lower(name) LIKE '%betano%';

  IF house_ids IS NULL THEN
    RETURN;
  END IF;

  -- Remove every public table that stores a house_id for Betano.
  FOR rec IN
    SELECT DISTINCT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'house_id'
      AND table_name <> 'betting_houses'
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I WHERE house_id = ANY($1)',
      rec.table_schema,
      rec.table_name
    ) USING house_ids;
  END LOOP;

  -- Profile-level promo links are legacy/global links. Clear any link that
  -- still points to Betano so it cannot leak into the Superbet UI.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'promo_link'
  ) THEN
    UPDATE public.profiles
    SET promo_link = ''
    WHERE lower(coalesce(promo_link, '')) LIKE '%betano%';
  END IF;

  DELETE FROM public.betting_houses
  WHERE id = ANY(house_ids);
END $$;
