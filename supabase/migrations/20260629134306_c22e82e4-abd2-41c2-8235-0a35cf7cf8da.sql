-- 0. Consolidate duplicate portfolio rows per (user, crypto_id)
WITH ranked AS (
  SELECT id, user_id, crypto_id,
         ROW_NUMBER() OVER (PARTITION BY user_id, crypto_id ORDER BY created_at ASC) AS rn
  FROM public.portfolio_items
),
summed AS (
  SELECT user_id, crypto_id, SUM(quantity) AS total_qty
  FROM public.portfolio_items
  GROUP BY user_id, crypto_id
)
UPDATE public.portfolio_items p
SET quantity = s.total_qty
FROM ranked r, summed s
WHERE p.id = r.id AND r.rn = 1
  AND s.user_id = p.user_id AND s.crypto_id = p.crypto_id;

DELETE FROM public.portfolio_items
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id, crypto_id ORDER BY created_at ASC) AS rn
    FROM public.portfolio_items
  ) x WHERE rn > 1
);

-- 1. Add optional crypto columns to transaction_requests
ALTER TABLE public.transaction_requests
  ADD COLUMN IF NOT EXISTS crypto_id text,
  ADD COLUMN IF NOT EXISTS crypto_symbol text,
  ADD COLUMN IF NOT EXISTS crypto_name text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit_price numeric;

-- 2. Unique index for upsert
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_items_user_crypto_uidx
  ON public.portfolio_items (user_id, crypto_id);

-- 3. Replace trigger function
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_qty numeric;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.type = 'deposit' THEN
      INSERT INTO public.customer_balances (customer_id, balance, currency, updated_by)
      VALUES (NEW.customer_id, NEW.amount, NEW.currency, NEW.processed_by)
      ON CONFLICT (customer_id)
      DO UPDATE SET
        balance = public.customer_balances.balance + NEW.amount,
        updated_at = NOW(),
        updated_by = NEW.processed_by;
    ELSIF NEW.type = 'withdraw' THEN
      UPDATE public.customer_balances
      SET balance = balance - NEW.amount,
          updated_at = NOW(),
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
          COALESCE(NEW.crypto_symbol, UPPER(NEW.crypto_id)),
          COALESCE(NEW.crypto_name, NEW.crypto_id),
          NEW.quantity,
          COALESCE(NEW.unit_price, CASE WHEN NEW.quantity > 0 THEN NEW.amount / NEW.quantity ELSE 0 END),
          NOW()
        )
        ON CONFLICT (user_id, crypto_id)
        DO UPDATE SET
          quantity = public.portfolio_items.quantity + EXCLUDED.quantity,
          updated_at = NOW();
      ELSIF NEW.type = 'withdraw' THEN
        SELECT quantity INTO v_existing_qty
        FROM public.portfolio_items
        WHERE user_id = NEW.customer_id AND crypto_id = NEW.crypto_id;

        IF v_existing_qty IS NULL OR v_existing_qty < NEW.quantity THEN
          RAISE EXCEPTION 'Insufficient % balance to withdraw %', NEW.crypto_id, NEW.quantity;
        END IF;

        IF v_existing_qty - NEW.quantity <= 0 THEN
          DELETE FROM public.portfolio_items
          WHERE user_id = NEW.customer_id AND crypto_id = NEW.crypto_id;
        ELSE
          UPDATE public.portfolio_items
          SET quantity = quantity - NEW.quantity,
              updated_at = NOW()
          WHERE user_id = NEW.customer_id AND crypto_id = NEW.crypto_id;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
