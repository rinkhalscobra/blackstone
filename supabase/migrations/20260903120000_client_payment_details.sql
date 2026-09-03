-- Per-client deposit instructions managed by CRM staff.
-- Details are JSON so each payment method can retain its own professional fields
-- without exposing those settings as editable profile data to the customer.
CREATE TABLE IF NOT EXISTS public.client_payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_payment_details_customer_method_key UNIQUE (customer_id, method),
  CONSTRAINT client_payment_details_object_check CHECK (jsonb_typeof(details) = 'object')
);

ALTER TABLE public.client_payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their payment details"
ON public.client_payment_details
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id AND is_active = true);

CREATE POLICY "Staff can view client payment details"
ON public.client_payment_details
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    (public.has_role(auth.uid(), 'group_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
    AND public.is_same_group(auth.uid(), customer_id)
  )
  OR (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = client_payment_details.customer_id
        AND profiles.assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "Staff can manage client payment details"
ON public.client_payment_details
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    (public.has_role(auth.uid(), 'group_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
    AND public.is_same_group(auth.uid(), customer_id)
  )
  OR (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = client_payment_details.customer_id
        AND profiles.assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    (public.has_role(auth.uid(), 'group_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'supervisor'::public.app_role))
    AND public.is_same_group(auth.uid(), customer_id)
  )
  OR (
    public.has_role(auth.uid(), 'agent'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = client_payment_details.customer_id
        AND profiles.assigned_to = auth.uid()
    )
  )
);

DROP TRIGGER IF EXISTS update_client_payment_details_updated_at ON public.client_payment_details;
CREATE TRIGGER update_client_payment_details_updated_at
BEFORE UPDATE ON public.client_payment_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transaction_requests
  ADD COLUMN IF NOT EXISTS payment_details jsonb,
  ADD COLUMN IF NOT EXISTS payment_instructions_snapshot jsonb;

COMMENT ON COLUMN public.transaction_requests.payment_details IS
  'Method-specific information submitted by the client. Never store full card numbers or CVVs.';
COMMENT ON COLUMN public.transaction_requests.payment_instructions_snapshot IS
  'Snapshot of CRM-configured destination details shown when the request was submitted.';
