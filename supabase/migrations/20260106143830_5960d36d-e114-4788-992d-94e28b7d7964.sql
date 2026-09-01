-- Fix Agent Assignment: Add UPDATE policies for profiles table
-- This allows staff to update customer profiles (e.g., assign agents)

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Supervisors can update group member profiles
CREATE POLICY "Supervisors can update group member profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'supervisor'::app_role) AND group_id = get_user_group(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) AND group_id = get_user_group(auth.uid()));

-- Agents can update assigned customer profiles
CREATE POLICY "Agents can update assigned customer profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'agent'::app_role) AND assigned_to = auth.uid())
WITH CHECK (has_role(auth.uid(), 'agent'::app_role) AND assigned_to = auth.uid());

-- Add wallet_address column to portfolio_items table
ALTER TABLE public.portfolio_items 
ADD COLUMN wallet_address TEXT;

COMMENT ON COLUMN public.portfolio_items.wallet_address IS 'Cryptocurrency wallet address for this portfolio item';