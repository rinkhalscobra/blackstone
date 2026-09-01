-- Create IP validation audit log table
CREATE TABLE public.ip_validation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  ipv4_address TEXT,
  ipv6_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL, -- 'ALLOWED', 'DENIED', 'ERROR'
  reason TEXT,
  matched_rule_id UUID REFERENCES public.ip_whitelist(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_ip_validation_logs_user_id ON public.ip_validation_logs(user_id);
CREATE INDEX idx_ip_validation_logs_created_at ON public.ip_validation_logs(created_at DESC);
CREATE INDEX idx_ip_validation_logs_action ON public.ip_validation_logs(action);
CREATE INDEX idx_ip_validation_logs_ipv4 ON public.ip_validation_logs(ipv4_address);
CREATE INDEX idx_ip_validation_logs_ipv6 ON public.ip_validation_logs(ipv6_address);

-- Enable RLS
ALTER TABLE public.ip_validation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and group_admins can view logs
CREATE POLICY "Admins can view all IP logs"
ON public.ip_validation_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Group admins can view logs for their group members"
ON public.ip_validation_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'group_admin') AND
  public.is_same_group(auth.uid(), user_id)
);

-- Allow edge function to insert logs (service role)
CREATE POLICY "Service role can insert logs"
ON public.ip_validation_logs
FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.ip_validation_logs IS 'Audit log for staff IP validation attempts during login';