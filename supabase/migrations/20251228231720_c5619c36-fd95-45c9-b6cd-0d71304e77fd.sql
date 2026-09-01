-- Add INSERT policy for staff to create notifications for users
-- Agents can create notifications for their assigned customers
-- Supervisors can create notifications for users in their group
-- Admins can create notifications for any user

CREATE POLICY "Agents can create notifications for assigned customers"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND assigned_to = auth.uid()
  )
);

CREATE POLICY "Supervisors can create notifications for group users"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), user_id)
);

CREATE POLICY "Admins can create notifications for any user"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add DELETE policy for staff
CREATE POLICY "Agents can delete notifications for assigned customers"
ON public.notifications
FOR DELETE
USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND assigned_to = auth.uid()
  )
);

CREATE POLICY "Supervisors can delete notifications for group users"
ON public.notifications
FOR DELETE
USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), user_id)
);

CREATE POLICY "Admins can delete notifications for any user"
ON public.notifications
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
);