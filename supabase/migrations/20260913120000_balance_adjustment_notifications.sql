-- Manual fiat and crypto balance changes must always create a customer
-- notification. Keeping both writes inside SECURITY DEFINER functions makes
-- the balance update and notification atomic.

CREATE OR REPLACE FUNCTION public.adjust_fiat_balance(
  p_customer_id uuid,
  p_currency text,
  p_amount numeric,
  p_adjustment_type text,
  p_reason text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_currency text := upper(trim(p_currency));
  v_reason text := nullif(trim(p_reason), '');
  v_amount numeric(20, 2);
  v_before numeric(20, 2) := 0;
  v_after numeric(20, 2);
  v_amount_text text;
  v_after_text text;
  v_can_manage boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_can_manage :=
    public.has_role(v_actor, 'admin'::public.app_role)
    OR (
      (
        public.has_role(v_actor, 'group_admin'::public.app_role)
        OR public.has_role(v_actor, 'supervisor'::public.app_role)
      )
      AND public.is_same_group(v_actor, p_customer_id)
    )
    OR (
      public.has_role(v_actor, 'agent'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_customer_id AND assigned_to = v_actor
      )
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'You do not have permission to manage this customer' USING ERRCODE = '42501';
  END IF;

  IF v_currency NOT IN ('EUR', 'USD', 'CAD') THEN
    RAISE EXCEPTION 'Unsupported fiat currency' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR round(p_amount, 2) <> p_amount THEN
    RAISE EXCEPTION 'Amount must be greater than zero with at most 2 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_adjustment_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Adjustment type must be credit or debit' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NOT NULL AND char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Reason cannot exceed 500 characters' USING ERRCODE = '22023';
  END IF;

  v_amount := p_amount;

  -- Serialize adjustments even when this currency row has not been created.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_customer_id::text || ':fiat:' || v_currency, 0)
  );

  INSERT INTO public.customer_balances (
    customer_id, currency, balance, updated_by, updated_at
  ) VALUES (
    p_customer_id, v_currency, 0, v_actor, now()
  )
  ON CONFLICT (customer_id, currency) DO NOTHING;

  SELECT balance INTO v_before
  FROM public.customer_balances
  WHERE customer_id = p_customer_id AND currency = v_currency
  FOR UPDATE;

  v_after := v_before + CASE
    WHEN p_adjustment_type = 'credit' THEN v_amount
    ELSE -v_amount
  END;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance. Available: %', v_currency, v_before USING ERRCODE = '22003';
  END IF;

  UPDATE public.customer_balances
  SET balance = v_after, updated_by = v_actor, updated_at = now()
  WHERE customer_id = p_customer_id AND currency = v_currency;

  v_amount_text := rtrim(rtrim(to_char(v_amount, 'FM99999999999999999990.99'), '0'), '.');
  v_after_text := rtrim(rtrim(to_char(v_after, 'FM99999999999999999990.99'), '0'), '.');

  INSERT INTO public.notifications (user_id, type, title, message, is_read)
  VALUES (
    p_customer_id,
    CASE WHEN p_adjustment_type = 'credit' THEN 'success' ELSE 'info' END,
    format(
      '%s cash balance %s',
      v_currency,
      CASE WHEN p_adjustment_type = 'credit' THEN 'credited' ELSE 'debited' END
    ),
    format(
      '%s %s was %s your cash balance. New balance: %s %s.%s',
      v_amount_text,
      v_currency,
      CASE WHEN p_adjustment_type = 'credit' THEN 'added to' ELSE 'deducted from' END,
      v_after_text,
      v_currency,
      CASE WHEN v_reason IS NULL THEN '' ELSE ' Note: ' || v_reason END
    ),
    false
  );

  RETURN v_after;
END;
$function$;

REVOKE ALL ON FUNCTION public.adjust_fiat_balance(uuid, text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_fiat_balance(uuid, text, numeric, text, text) TO authenticated;

COMMENT ON FUNCTION public.adjust_fiat_balance(uuid, text, numeric, text, text) IS
  'Atomically credits or debits a customer fiat balance and notifies the customer.';


-- Replace the existing crypto adjustment function to add the customer
-- notification while preserving its current balance and audit behavior.
CREATE OR REPLACE FUNCTION public.adjust_crypto_balance(
  p_customer_id uuid,
  p_crypto_id text,
  p_crypto_symbol text,
  p_crypto_name text,
  p_amount numeric,
  p_adjustment_type text,
  p_reason text DEFAULT NULL,
  p_unit_price numeric DEFAULT 0
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_crypto_id text := lower(trim(p_crypto_id));
  v_symbol text := upper(trim(p_crypto_symbol));
  v_name text := trim(p_crypto_name);
  v_reason text := nullif(trim(p_reason), '');
  v_amount numeric(20, 8);
  v_before numeric(20, 8) := 0;
  v_after numeric(20, 8);
  v_amount_text text;
  v_after_text text;
  v_holding public.portfolio_items%ROWTYPE;
  v_can_manage boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_can_manage :=
    public.has_role(v_actor, 'admin'::public.app_role)
    OR (
      (
        public.has_role(v_actor, 'group_admin'::public.app_role)
        OR public.has_role(v_actor, 'supervisor'::public.app_role)
      )
      AND public.is_same_group(v_actor, p_customer_id)
    )
    OR (
      public.has_role(v_actor, 'agent'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_customer_id AND assigned_to = v_actor
      )
    );

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'You do not have permission to manage this customer' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR round(p_amount, 8) <> p_amount THEN
    RAISE EXCEPTION 'Amount must be greater than zero with at most 8 decimal places' USING ERRCODE = '22023';
  END IF;
  IF p_adjustment_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Adjustment type must be credit or debit' USING ERRCODE = '22023';
  END IF;
  IF v_crypto_id = '' OR v_symbol !~ '^[A-Z0-9]{2,15}$' OR v_name = '' OR char_length(v_name) > 80 THEN
    RAISE EXCEPTION 'Invalid cryptocurrency details' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NOT NULL AND char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Reason cannot exceed 500 characters' USING ERRCODE = '22023';
  END IF;

  v_amount := p_amount;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || v_crypto_id, 0));

  SELECT * INTO v_holding
  FROM public.portfolio_items
  WHERE user_id = p_customer_id AND crypto_id = v_crypto_id
  FOR UPDATE;

  IF FOUND THEN
    v_before := v_holding.quantity;
  END IF;

  v_after := v_before + CASE
    WHEN p_adjustment_type = 'credit' THEN v_amount
    ELSE -v_amount
  END;

  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance. Available: %', v_symbol, v_before USING ERRCODE = '22003';
  END IF;

  IF p_adjustment_type = 'credit' THEN
    INSERT INTO public.portfolio_items (
      user_id, crypto_id, crypto_symbol, crypto_name, quantity, purchase_price, purchase_date
    ) VALUES (
      p_customer_id, v_crypto_id, v_symbol, v_name, v_amount, greatest(coalesce(p_unit_price, 0), 0), now()
    )
    ON CONFLICT (user_id, crypto_id) DO UPDATE SET
      crypto_symbol = EXCLUDED.crypto_symbol,
      crypto_name = EXCLUDED.crypto_name,
      purchase_price = CASE
        WHEN EXCLUDED.purchase_price > 0 THEN
          ((public.portfolio_items.quantity * public.portfolio_items.purchase_price)
            + (EXCLUDED.quantity * EXCLUDED.purchase_price))
          / (public.portfolio_items.quantity + EXCLUDED.quantity)
        ELSE public.portfolio_items.purchase_price
      END,
      quantity = public.portfolio_items.quantity + EXCLUDED.quantity,
      updated_at = now();
  ELSIF v_after = 0 THEN
    DELETE FROM public.portfolio_items
    WHERE user_id = p_customer_id AND crypto_id = v_crypto_id;
  ELSE
    UPDATE public.portfolio_items
    SET quantity = v_after, updated_at = now()
    WHERE user_id = p_customer_id AND crypto_id = v_crypto_id;
  END IF;

  INSERT INTO public.crypto_balance_adjustments (
    customer_id, crypto_id, crypto_symbol, crypto_name, adjustment_type,
    amount, balance_before, balance_after, reason, created_by
  ) VALUES (
    p_customer_id, v_crypto_id, v_symbol, v_name, p_adjustment_type,
    v_amount, v_before, v_after, v_reason, v_actor
  );

  v_amount_text := rtrim(rtrim(to_char(v_amount, 'FM99999999999999999990.99999999'), '0'), '.');
  v_after_text := rtrim(rtrim(to_char(v_after, 'FM99999999999999999990.99999999'), '0'), '.');

  INSERT INTO public.notifications (user_id, type, title, message, is_read)
  VALUES (
    p_customer_id,
    CASE WHEN p_adjustment_type = 'credit' THEN 'success' ELSE 'info' END,
    format(
      '%s crypto balance %s',
      v_symbol,
      CASE WHEN p_adjustment_type = 'credit' THEN 'credited' ELSE 'debited' END
    ),
    format(
      '%s %s was %s your crypto balance. New balance: %s %s.%s',
      v_amount_text,
      v_symbol,
      CASE WHEN p_adjustment_type = 'credit' THEN 'added to' ELSE 'deducted from' END,
      v_after_text,
      v_symbol,
      CASE WHEN v_reason IS NULL THEN '' ELSE ' Note: ' || v_reason END
    ),
    false
  );

  RETURN v_after;
END;
$function$;

COMMENT ON FUNCTION public.adjust_crypto_balance(uuid, text, text, text, numeric, text, text, numeric) IS
  'Atomically credits or debits a customer crypto holding, records the audit trail, and notifies the customer.';
