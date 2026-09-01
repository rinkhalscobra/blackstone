-- Allow supervisors to view roles of users in their group
CREATE POLICY "Supervisors can view group member roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND is_same_group(auth.uid(), user_id)
);

-- Allow agents to view roles of their assigned customers
CREATE POLICY "Agents can view assigned customer roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = user_roles.user_id 
    AND profiles.assigned_to = auth.uid()
  )
);