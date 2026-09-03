-- A crypto asset transfer represents movement in the portfolio ledger. It must
-- not also change the fiat cash ledger, otherwise the same value is counted
-- twice in Total Account Value.
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
  v_balance_currency text;
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

  UPDATE public.transaction_requests
  SET balance_applied_at = now()
  WHERE id = NEW.id
    AND balance_applied_at IS NULL;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RETURN NEW;
  END IF;

  -- Fiat deposits and withdrawals affect available cash. Crypto transfers with
  -- an explicit asset quantity affect holdings only.
  IF NOT v_is_portfolio_transaction THEN
    SELECT balance, upper(currency)
    INTO v_balance, v_balance_currency
    FROM public.customer_balances
    WHERE customer_id = NEW.customer_id
    FOR UPDATE;

    IF NEW.type = 'deposit' THEN
      IF v_balance_currency IS NULL THEN
        INSERT INTO public.customer_balances (
          customer_id, balance, currency, updated_by
        ) VALUES (
          NEW.customer_id, NEW.amount, v_transaction_currency, NEW.processed_by
        );
      ELSE
        IF v_balance_currency <> v_transaction_currency THEN
          RAISE EXCEPTION
            'Cannot apply a % deposit to a % balance without an exchange rate',
            v_transaction_currency,
            v_balance_currency
            USING ERRCODE = '22023';
        END IF;

        UPDATE public.customer_balances
        SET balance = balance + NEW.amount,
            updated_at = now(),
            updated_by = NEW.processed_by
        WHERE customer_id = NEW.customer_id;
      END IF;
    ELSIF NEW.type = 'withdraw' THEN
      IF v_balance_currency IS NULL THEN
        RAISE EXCEPTION 'No account balance exists for this customer';
      END IF;

      IF v_balance_currency <> v_transaction_currency THEN
        RAISE EXCEPTION
          'Cannot apply a % withdrawal to a % balance without an exchange rate',
          v_transaction_currency,
          v_balance_currency
          USING ERRCODE = '22023';
      END IF;

      IF v_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient account balance for this withdrawal';
      END IF;

      UPDATE public.customer_balances
      SET balance = balance - NEW.amount,
          updated_at = now(),
          updated_by = NEW.processed_by
      WHERE customer_id = NEW.customer_id;
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
  'Applies approved fiat transactions to cash and explicit-quantity crypto transactions to holdings, never both.';
