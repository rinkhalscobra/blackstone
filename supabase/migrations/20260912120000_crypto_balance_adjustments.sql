-- Staff-managed crypto balances use portfolio_items as the single source of
-- truth. This audit table records every manual CRM adjustment and its reason.
CREATE TABLE public.crypto_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crypto_id text NOT NULL,
  crypto_symbol text NOT NULL,
  crypto_name text NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('credit', 'debit')),
  amount numeric(20, 8) NOT NULL CHECK (amount > 0),
  balance_before numeric(20, 8) NOT NULL CHECK (balance_before >= 0),
  balance_after numeric(20, 8) NOT NULL CHECK (balance_after >= 0),
  reason text CHECK (reason IS NULL OR char_length(reason) <= 500),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crypto_balance_adjustments_customer_created_idx
  ON public.crypto_balance_adjustments (customer_id, created_at DESC);

ALTER TABLE public.crypto_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own crypto adjustments"
ON public.crypto_balance_adjustments FOR SELECT TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view crypto adjustments"
ON public.crypto_balance_adjustments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Group staff can view crypto adjustments"
ON public.crypto_balance_adjustments FOR SELECT TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'group_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
  )
  AND public.is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Assigned agents can view crypto adjustments"
ON public.crypto_balance_adjustments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS customer
    WHERE customer.id = crypto_balance_adjustments.customer_id
      AND customer.assigned_to = auth.uid()
  )
);

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
  v_before numeric(20, 8) := 0;
  v_after numeric(20, 8);
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

  -- Serialize adjustments for one customer/asset even when the holding row
  -- does not exist yet, so balance_before and balance_after remain exact.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || v_crypto_id, 0));

  SELECT * INTO v_holding
  FROM public.portfolio_items
  WHERE user_id = p_customer_id AND crypto_id = v_crypto_id
  FOR UPDATE;

  IF FOUND THEN
    v_before := v_holding.quantity;
  END IF;

  v_after := v_before + CASE WHEN p_adjustment_type = 'credit' THEN p_amount ELSE -p_amount END;
  IF v_after < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance. Available: %', v_symbol, v_before USING ERRCODE = '22003';
  END IF;

  IF p_adjustment_type = 'credit' THEN
    INSERT INTO public.portfolio_items (
      user_id, crypto_id, crypto_symbol, crypto_name, quantity, purchase_price, purchase_date
    ) VALUES (
      p_customer_id, v_crypto_id, v_symbol, v_name, p_amount, greatest(coalesce(p_unit_price, 0), 0), now()
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
    p_amount, v_before, v_after, v_reason, v_actor
  );

  RETURN v_after;
END;
$function$;

REVOKE ALL ON FUNCTION public.adjust_crypto_balance(uuid, text, text, text, numeric, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_crypto_balance(uuid, text, text, text, numeric, text, text, numeric) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_balance_adjustments;

COMMENT ON FUNCTION public.adjust_crypto_balance(uuid, text, text, text, numeric, text, text, numeric) IS
  'Atomically credits or debits a customer crypto holding and records the staff adjustment audit trail.';
