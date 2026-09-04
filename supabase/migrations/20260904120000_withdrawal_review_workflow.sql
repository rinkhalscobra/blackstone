-- Store the CRM decision message with the transaction so the client can always
-- see the exact response, even if notification delivery is delayed.
ALTER TABLE public.transaction_requests
  ADD COLUMN IF NOT EXISTS review_message text;

ALTER TABLE public.transaction_requests
  DROP CONSTRAINT IF EXISTS transaction_requests_review_message_length_check;

ALTER TABLE public.transaction_requests
  ADD CONSTRAINT transaction_requests_review_message_length_check
  CHECK (review_message IS NULL OR char_length(review_message) <= 2000);

COMMENT ON COLUMN public.transaction_requests.review_message IS
  'Staff-authored approval or rejection message displayed to the customer.';

-- A customer may create a request only for themselves and only in the pending
-- state. Review-only fields cannot be supplied through the client API.
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transaction_requests;
CREATE POLICY "Users can create own pending transactions"
ON public.transaction_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id
  AND status = 'pending'::public.transaction_status
  AND processed_by IS NULL
  AND processed_at IS NULL
  AND balance_applied_at IS NULL
  AND review_message IS NULL
);

-- Replace the old broad supervisor policy with role- and assignment-scoped
-- review permissions. Existing SELECT policies continue to control visibility.
DROP POLICY IF EXISTS "Staff can manage transaction requests" ON public.transaction_requests;
DROP POLICY IF EXISTS "Admins can manage transaction requests" ON public.transaction_requests;
DROP POLICY IF EXISTS "Supervisors can review group transaction requests" ON public.transaction_requests;
DROP POLICY IF EXISTS "Agents can review assigned customer transactions" ON public.transaction_requests;

CREATE POLICY "Admins can manage transaction requests"
ON public.transaction_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Supervisors can review group transaction requests"
ON public.transaction_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor'::public.app_role)
  AND public.is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can review assigned customer transactions"
ON public.transaction_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = transaction_requests.customer_id
      AND profiles.assigned_to = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'agent'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = transaction_requests.customer_id
      AND profiles.assigned_to = auth.uid()
  )
);
