-- Create customer notes table
CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transaction request type enum
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdraw');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected', 'processing');
CREATE TYPE public.payment_method AS ENUM ('crypto_wallet', 'wire_transfer', 'credit_card', 'bank_transfer');

-- Create transaction requests table
CREATE TABLE public.transaction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  method payment_method NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user sessions/access log table
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  login_ip TEXT,
  access_token TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Add case_number and subscription to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS case_number TEXT,
ADD COLUMN IF NOT EXISTS subscription TEXT DEFAULT 'BASIC';

-- Generate case numbers for existing profiles
UPDATE public.profiles 
SET case_number = 'DX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') || '-' || SUBSTRING(id::TEXT, 1, 2)
WHERE case_number IS NULL;

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS for customer_notes
CREATE POLICY "Staff can manage customer notes" ON public.customer_notes
FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'agent')
);

-- RLS for transaction_requests  
CREATE POLICY "Staff can view all transaction requests" ON public.transaction_requests
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'agent')
);

CREATE POLICY "Staff can manage transaction requests" ON public.transaction_requests
FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Users can view own transactions" ON public.transaction_requests
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create own transactions" ON public.transaction_requests
FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- RLS for user_sessions
CREATE POLICY "Staff can view all sessions" ON public.user_sessions
FOR SELECT USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'supervisor') OR 
  public.has_role(auth.uid(), 'agent')
);

CREATE POLICY "Users can view own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

-- Trigger for notes updated_at
CREATE TRIGGER update_customer_notes_updated_at
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();