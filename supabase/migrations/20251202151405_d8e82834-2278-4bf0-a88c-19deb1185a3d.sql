-- Create status enum for user accounts
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');

-- Create action enum for IP whitelist
CREATE TYPE public.ip_action AS ENUM ('ALLOW', 'DENY');

-- Create groups table (offices)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create promocodes table
CREATE TABLE public.promocodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  role_type app_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  times_used INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create IP whitelist table
CREATE TABLE public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  ip_version TEXT NOT NULL DEFAULT 'IPv4',
  action ip_action NOT NULL DEFAULT 'ALLOW',
  subject TEXT NOT NULL DEFAULT 'EVERYONE',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_super BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's group
CREATE OR REPLACE FUNCTION public.get_user_group(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- Helper function to check if users are in same group
CREATE OR REPLACE FUNCTION public.is_same_group(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT group_id FROM public.profiles WHERE id = _user_id_1
  ) = (
    SELECT group_id FROM public.profiles WHERE id = _user_id_2
  )
$$;

-- RLS Policies for groups
CREATE POLICY "Admins can manage all groups" ON public.groups
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view their group" ON public.groups
FOR SELECT USING (
  public.has_role(auth.uid(), 'supervisor') AND 
  id = public.get_user_group(auth.uid())
);

-- RLS Policies for promocodes
CREATE POLICY "Admins can manage all promocodes" ON public.promocodes
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can manage their group promocodes" ON public.promocodes
FOR ALL USING (
  public.has_role(auth.uid(), 'supervisor') AND 
  group_id = public.get_user_group(auth.uid())
);

-- RLS Policies for ip_whitelist
CREATE POLICY "Admins can manage IP whitelist" ON public.ip_whitelist
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles RLS - supervisors can view users in their group
CREATE POLICY "Supervisors can view group members" ON public.profiles
FOR SELECT USING (
  public.has_role(auth.uid(), 'supervisor') AND 
  group_id = public.get_user_group(auth.uid())
);

-- Trigger to update updated_at on groups
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();