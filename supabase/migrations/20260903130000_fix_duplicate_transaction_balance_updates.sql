-- Ensure that one transaction approval changes a customer's balance exactly once.
-- Several historical migrations attached the same function under different trigger
-- names, so a single approval could be credited or debited multiple times.

ALTER TABLE public.transaction_requests
  ADD COLUMN IF NOT EXISTS balance_applied_at timestamptz;

-- Repair the narrow, unambiguous form of the historical bug: a customer has one
-- approved deposit and the stored balance is exactly three times that deposit.
-- Do not attempt a broad recalculation because balances may also include legitimate
-- manual CRM adjustments.
WITH customers_with_one_approval AS (
  SELECT customer_id
  FROM public.transaction_requests
  WHERE status = 'approved'
  GROUP BY customer_id
  HAVING count(*) = 1
), repairable_deposits AS (
  SELECT tr.customer_id, tr.amount, upper(tr.currency) AS currency
  FROM public.transaction_requests tr
  JOIN customers_with_one_approval candidate
    ON candidate.customer_id = tr.customer_id
  WHERE tr.status = 'approved'
    AND tr.type = 'deposit'
)
UPDATE public.customer_balances balance
SET balance = deposit.amount,
    currency = deposit.currency,
    updated_at = now()
FROM repairable_deposits deposit
WHERE balance.customer_id = deposit.customer_id
  AND balance.balance = deposit.amount * 3;

-- Existing approvals have already affected their balances. Mark them as processed
-- so a later edit cannot apply them again.
UPDATE public.transaction_requests
SET balance_applied_at = COALESCE(processed_at, created_at, now())
WHERE status = 'approved'
  AND balance_applied_at IS NULL;

DROP TRIGGER IF EXISTS on_transaction_approved
  ON public.transaction_requests;
DROP TRIGGER IF EXISTS update_balance_on_transaction_approval
  ON public.transaction_requests;
DROP TRIGGER IF EXISTS update_balance_after_transaction
  ON public.transaction_requests;
DROP TRIGGER IF EXISTS trg_update_balance_on_transaction_approval
  ON public.transaction_requests;

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
BEGIN
  IF NEW.status <> 'approved' OR OLD.status IS NOT DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;

  -- Claim this approval atomically. This is a second line of defence against
  -- duplicate triggers or repeated processing attempts.
  UPDATE public.transaction_requests
  SET balance_applied_at = now()
  WHERE id = NEW.id
    AND balance_applied_at IS NULL;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RETURN NEW;
  END IF;

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

  IF NEW.crypto_id IS NOT NULL AND NEW.quantity IS NOT NULL AND NEW.quantity > 0 THEN
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
        COALESCE(
          NEW.unit_price,
          CASE WHEN NEW.quantity > 0 THEN NEW.amount / NEW.quantity ELSE 0 END
        ),
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
        RAISE EXCEPTION 'Insufficient % balance to withdraw %',
          NEW.crypto_id,
          NEW.quantity;
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

CREATE TRIGGER trg_update_balance_on_transaction_approval
  AFTER UPDATE OF status ON public.transaction_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION public.update_balance_on_transaction_approval();

COMMENT ON COLUMN public.transaction_requests.balance_applied_at IS
  'Timestamp at which an approved transaction was applied to the customer balance; prevents duplicate application.';
