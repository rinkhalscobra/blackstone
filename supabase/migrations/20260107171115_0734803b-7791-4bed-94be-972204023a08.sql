-- Create user_mfa table for storing TOTP secrets
CREATE TABLE public.user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  totp_secret TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own MFA settings
CREATE POLICY "Users can view their own MFA settings"
ON public.user_mfa
FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert their own MFA settings
CREATE POLICY "Users can insert their own MFA settings"
ON public.user_mfa
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only users can update their own MFA settings
CREATE POLICY "Users can update their own MFA settings"
ON public.user_mfa
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view MFA status of users in their group (for group_admin) or all users (for admin)
CREATE POLICY "Admins can view MFA status"
ON public.user_mfa
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id))
);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_mfa_updated_at
BEFORE UPDATE ON public.user_mfa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();