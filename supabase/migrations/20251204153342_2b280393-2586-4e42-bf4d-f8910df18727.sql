-- Add assigned_to column for agent assignment
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- RLS policy for agents to view their assigned customers
CREATE POLICY "Agents can view assigned customers" ON public.profiles
FOR SELECT USING (
  public.has_role(auth.uid(), 'agent') AND assigned_to = auth.uid()
);