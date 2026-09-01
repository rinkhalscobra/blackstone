-- Create customer_balances table for managing client "exchange" balances
CREATE TABLE public.customer_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(customer_id, currency)
);

-- Create notifications table for real-time alerts
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create case_timeline table for tracking case progress
CREATE TABLE public.case_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_timeline ENABLE ROW LEVEL SECURITY;

-- Customer Balances Policies
CREATE POLICY "Users can view their own balance"
ON public.customer_balances FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view all balances"
ON public.customer_balances FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'agent'));

CREATE POLICY "Staff can manage balances"
ON public.customer_balances FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor'));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Staff can manage notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'agent'));

-- Case Timeline Policies
CREATE POLICY "Users can view their own timeline"
ON public.case_timeline FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view all timelines"
ON public.case_timeline FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'agent'));

CREATE POLICY "Staff can manage timelines"
ON public.case_timeline FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'agent'));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_balances;