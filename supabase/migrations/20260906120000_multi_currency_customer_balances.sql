-- Give every account an independent EUR, USD, and CAD cash balance.
-- Existing money stays in its current currency; missing currency rows start at zero.

ALTER TABLE public.customer_balances
  DROP CONSTRAINT IF EXISTS customer_balances_customer_id_unique;

UPDATE public.customer_balances
SET currency = upper(trim(currency));

ALTER TABLE public.customer_balances
  DROP CONSTRAINT IF EXISTS customer_balances_customer_id_currency_key;

ALTER TABLE public.customer_balances
  DROP CONSTRAINT IF EXISTS customer_balances_customer_currency_unique;

ALTER TABLE public.customer_balances
  ADD CONSTRAINT customer_balances_customer_currency_unique
  UNIQUE (customer_id, currency);

INSERT INTO public.customer_balances (customer_id, currency, balance)
SELECT profile.id, supported.currency, 0
FROM public.profiles AS profile
CROSS JOIN (VALUES ('EUR'), ('USD'), ('CAD')) AS supported(currency)
ON CONFLICT (customer_id, currency) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_customer_currency_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.customer_balances (customer_id, currency, balance)
  VALUES
    (NEW.id, 'EUR', 0),
    (NEW.id, 'USD', 0),
    (NEW.id, 'CAD', 0)
  ON CONFLICT (customer_id, currency) DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS seed_customer_currency_balances_on_profile
  ON public.profiles;

CREATE TRIGGER seed_customer_currency_balances_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.seed_customer_currency_balances();

-- Apply approved fiat transactions to the matching currency ledger. Crypto
-- transfers continue to change portfolio quantities only.
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
  v_existing_qty numeric;
  v_claimed integer;
  v_transaction_currency text := upper(trim(NEW.currency));
  v_is_portfolio_transaction boolean :=
    NEW.crypto_id IS NOT NULL AND NEW.quantity IS NOT NULL AND NEW.quantity > 0;
BEGIN
  IF NEW.status <> 'approved' OR OLD.status IS NOT DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;

  IF NOT v_is_portfolio_transaction AND v_transaction_currency NOT IN ('EUR', 'USD', 'CAD') THEN
    RAISE EXCEPTION 'Unsupported balance currency: %', v_transaction_currency
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.transaction_requests
  SET balance_applied_at = now()
  WHERE id = NEW.id
    AND balance_applied_at IS NULL;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RETURN NEW;
  END IF;

  IF NOT v_is_portfolio_transaction THEN
    INSERT INTO public.customer_balances (customer_id, currency, balance, updated_by)
    VALUES (NEW.customer_id, v_transaction_currency, 0, NEW.processed_by)
    ON CONFLICT (customer_id, currency) DO NOTHING;

    SELECT balance
    INTO v_balance
    FROM public.customer_balances
    WHERE customer_id = NEW.customer_id
      AND currency = v_transaction_currency
    FOR UPDATE;

    IF NEW.type = 'deposit' THEN
      UPDATE public.customer_balances
      SET balance = balance + NEW.amount,
          updated_at = now(),
          updated_by = NEW.processed_by
      WHERE customer_id = NEW.customer_id
        AND currency = v_transaction_currency;
    ELSIF NEW.type = 'withdraw' THEN
      IF COALESCE(v_balance, 0) < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient % balance for this withdrawal', v_transaction_currency;
      END IF;

      UPDATE public.customer_balances
      SET balance = balance - NEW.amount,
          updated_at = now(),
          updated_by = NEW.processed_by
      WHERE customer_id = NEW.customer_id
        AND currency = v_transaction_currency;
    END IF;
  END IF;

  IF v_is_portfolio_transaction THEN
    IF NEW.type = 'deposit' THEN
      INSERT INTO public.portfolio_items (
        user_id, crypto_id, crypto_symbol, crypto_name,
        quantity, purchase_price, purchase_date
      )
      VALUES (
        NEW.customer_id,
        NEW.crypto_id,
        COALESCE(NEW.crypto_symbol, upper(NEW.crypto_id)),
        COALESCE(NEW.crypto_name, NEW.crypto_id),
        NEW.quantity,
        COALESCE(NEW.unit_price, NEW.amount / NEW.quantity),
        now()
      )
      ON CONFLICT (user_id, crypto_id)
      DO UPDATE SET
        quantity = public.portfolio_items.quantity + EXCLUDED.quantity,
        updated_at = now();
    ELSIF NEW.type = 'withdraw' THEN
      SELECT quantity
      INTO v_existing_qty
      FROM public.portfolio_items
      WHERE user_id = NEW.customer_id
        AND crypto_id = NEW.crypto_id
      FOR UPDATE;

      IF v_existing_qty IS NULL OR v_existing_qty < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient % balance to withdraw %', NEW.crypto_id, NEW.quantity;
      END IF;

      IF v_existing_qty - NEW.quantity <= 0 THEN
        DELETE FROM public.portfolio_items
        WHERE user_id = NEW.customer_id
          AND crypto_id = NEW.crypto_id;
      ELSE
        UPDATE public.portfolio_items
        SET quantity = quantity - NEW.quantity,
            updated_at = now()
        WHERE user_id = NEW.customer_id
          AND crypto_id = NEW.crypto_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_balance_on_transaction_approval() IS
  'Applies each approved fiat transaction to the customer balance row with the same currency; crypto transfers affect holdings only.';
