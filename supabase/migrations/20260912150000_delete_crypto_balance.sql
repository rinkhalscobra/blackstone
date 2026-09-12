-- Delete an entire crypto holding through the same atomic adjustment path so
-- the removed quantity remains recorded in the manual-adjustment audit trail.
CREATE OR REPLACE FUNCTION public.delete_crypto_balance(
  p_customer_id uuid,
  p_crypto_id text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_crypto_id text := lower(trim(p_crypto_id));
  v_holding public.portfolio_items%ROWTYPE;
BEGIN
  IF v_crypto_id = '' THEN
    RAISE EXCEPTION 'Cryptocurrency is required' USING ERRCODE = '22023';
  END IF;

  -- Match adjust_crypto_balance's lock so a concurrent credit or debit cannot
  -- change the quantity between reading it and removing it.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || v_crypto_id, 0));

  SELECT * INTO v_holding
  FROM public.portfolio_items
  WHERE user_id = p_customer_id AND crypto_id = v_crypto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crypto balance no longer exists' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.adjust_crypto_balance(
    p_customer_id,
    v_holding.crypto_id,
    v_holding.crypto_symbol,
    v_holding.crypto_name,
    v_holding.quantity,
    'debit',
    'Crypto balance deleted from CRM',
    0
  );

  RETURN v_holding.quantity;
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_crypto_balance(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_crypto_balance(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.delete_crypto_balance(uuid, text) IS
  'Atomically removes a complete customer crypto holding while preserving an audited debit record.';
