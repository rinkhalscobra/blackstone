-- Create password reset requests table
CREATE TABLE public.password_reset_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  new_password_hash TEXT NOT NULL,
  reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all password reset requests"
ON public.password_reset_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Group Admins can view and manage requests for users in their group
CREATE POLICY "Group Admins can view group password reset requests"
ON public.password_reset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
);

CREATE POLICY "Group Admins can update group password reset requests"
ON public.password_reset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
);

-- Supervisors can view and manage requests for users in their group
CREATE POLICY "Supervisors can view group password reset requests"
ON public.password_reset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
);

CREATE POLICY "Supervisors can update group password reset requests"
ON public.password_reset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
);

-- Agents can view their own requests
CREATE POLICY "Agents can view their own requests"
ON public.password_reset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND requested_by = auth.uid()
);

-- Staff can insert requests for users they have access to
CREATE POLICY "Group Admins can create requests for group users"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
  AND requested_by = auth.uid()
);

CREATE POLICY "Supervisors can create requests for group users"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND is_same_group(auth.uid(), target_user_id)
  AND requested_by = auth.uid()
);

CREATE POLICY "Agents can create requests for assigned customers"
ON public.password_reset_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND requested_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = target_user_id AND assigned_to = auth.uid()
  )
);

-- Add index for faster lookups
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_target_user ON public.password_reset_requests(target_user_id);