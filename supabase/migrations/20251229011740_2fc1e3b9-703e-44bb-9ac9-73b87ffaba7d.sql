-- Drop user modification policies (users should only view, not modify)
DROP POLICY IF EXISTS "Users can insert their own portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can update their own portfolio items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Users can delete their own portfolio items" ON public.portfolio_items;

-- Add staff management policies for INSERT
CREATE POLICY "Admins can insert portfolio items"
ON public.portfolio_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can insert group portfolio items"
ON public.portfolio_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Agents can insert assigned customer portfolio items"
ON public.portfolio_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = portfolio_items.user_id AND profiles.assigned_to = auth.uid())
);

-- Add staff management policies for UPDATE
CREATE POLICY "Admins can update portfolio items"
ON public.portfolio_items
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can update group portfolio items"
ON public.portfolio_items
FOR UPDATE
USING (has_role(auth.uid(), 'supervisor'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Agents can update assigned customer portfolio items"
ON public.portfolio_items
FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = portfolio_items.user_id AND profiles.assigned_to = auth.uid())
);

-- Add staff management policies for DELETE
CREATE POLICY "Admins can delete portfolio items"
ON public.portfolio_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can delete group portfolio items"
ON public.portfolio_items
FOR DELETE
USING (has_role(auth.uid(), 'supervisor'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Agents can delete assigned customer portfolio items"
ON public.portfolio_items
FOR DELETE
USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = portfolio_items.user_id AND profiles.assigned_to = auth.uid())
);