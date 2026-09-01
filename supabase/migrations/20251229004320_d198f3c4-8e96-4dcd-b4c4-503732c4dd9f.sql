-- Function to update customer balance automatically when transaction is approved
CREATE OR REPLACE FUNCTION public.update_balance_on_transaction_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.type = 'deposit' THEN
      -- Add to balance for deposits - insert or update
      INSERT INTO public.customer_balances (customer_id, balance, currency, updated_by)
      VALUES (NEW.customer_id, NEW.amount, NEW.currency, NEW.processed_by)
      ON CONFLICT (customer_id) 
      DO UPDATE SET 
        balance = public.customer_balances.balance + NEW.amount,
        updated_at = NOW(),
        updated_by = NEW.processed_by;
    ELSIF NEW.type = 'withdraw' THEN
      -- Subtract from balance for withdrawals
      UPDATE public.customer_balances
      SET 
        balance = balance - NEW.amount,
        updated_at = NOW(),
        updated_by = NEW.processed_by
      WHERE customer_id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create unique constraint on customer_id for upsert to work
ALTER TABLE public.customer_balances 
ADD CONSTRAINT customer_balances_customer_id_unique UNIQUE (customer_id);

-- Trigger on transaction_requests
CREATE TRIGGER on_transaction_approved
  AFTER UPDATE ON public.transaction_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_balance_on_transaction_approval();

-- Add visible_to_client column to customer_notes for staff instructions
ALTER TABLE public.customer_notes 
ADD COLUMN visible_to_client BOOLEAN DEFAULT false;

-- Add RLS policy for clients to view notes marked visible
CREATE POLICY "Users can view notes marked visible to them"
ON public.customer_notes
FOR SELECT
USING (visible_to_client = true AND auth.uid() = customer_id);