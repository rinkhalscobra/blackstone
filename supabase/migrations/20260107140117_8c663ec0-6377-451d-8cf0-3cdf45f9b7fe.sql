-- Update RLS policies for profiles table - Group Admins can view and update group members
CREATE POLICY "Group Admins can view group members" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND (group_id = get_user_group(auth.uid())));

CREATE POLICY "Group Admins can update group member profiles" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND (group_id = get_user_group(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'group_admin'::app_role) AND (group_id = get_user_group(auth.uid())));

-- Group Admins can view and manage user_roles within their group (except admin roles)
CREATE POLICY "Group Admins can view group member roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Group Admins can insert group member roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), user_id) 
  AND role NOT IN ('admin'::app_role, 'group_admin'::app_role)
);

CREATE POLICY "Group Admins can update group member roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), user_id) 
  AND role NOT IN ('admin'::app_role, 'group_admin'::app_role)
);

CREATE POLICY "Group Admins can delete group member roles" 
ON public.user_roles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'group_admin'::app_role) 
  AND is_same_group(auth.uid(), user_id) 
  AND role NOT IN ('admin'::app_role, 'group_admin'::app_role)
);

-- Group Admins can view their group
CREATE POLICY "Group Admins can view their group" 
ON public.groups 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND (id = get_user_group(auth.uid())));

-- Group Admins can manage transaction_requests within their group
CREATE POLICY "Group Admins can manage group transactions" 
ON public.transaction_requests 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), customer_id));

-- Group Admins can manage customer_balances within their group
CREATE POLICY "Group Admins can manage group balances" 
ON public.customer_balances 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), customer_id));

-- Group Admins can manage messages within their group
CREATE POLICY "Group Admins can view group messages" 
ON public.messages 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND (is_same_group(auth.uid(), sender_id) OR is_same_group(auth.uid(), recipient_id)));

CREATE POLICY "Group Admins can send messages to group members" 
ON public.messages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'group_admin'::app_role) AND (auth.uid() = sender_id) AND is_same_group(auth.uid(), recipient_id));

-- Group Admins can manage notifications within their group
CREATE POLICY "Group Admins can manage group notifications" 
ON public.notifications 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

-- Group Admins can manage customer_notes within their group
CREATE POLICY "Group Admins can manage group customer notes" 
ON public.customer_notes 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), customer_id));

-- Group Admins can manage portfolio_items within their group
CREATE POLICY "Group Admins can view group portfolio items" 
ON public.portfolio_items 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Group Admins can insert group portfolio items" 
ON public.portfolio_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Group Admins can update group portfolio items" 
ON public.portfolio_items 
FOR UPDATE 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

CREATE POLICY "Group Admins can delete group portfolio items" 
ON public.portfolio_items 
FOR DELETE 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));

-- Group Admins can manage case_timeline within their group
CREATE POLICY "Group Admins can manage group timelines" 
ON public.case_timeline 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), customer_id));

-- Group Admins can manage promocodes within their group
CREATE POLICY "Group Admins can manage group promocodes" 
ON public.promocodes 
FOR ALL 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND (group_id = get_user_group(auth.uid())));

-- Group Admins can view user_sessions within their group
CREATE POLICY "Group Admins can view group sessions" 
ON public.user_sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'group_admin'::app_role) AND is_same_group(auth.uid(), user_id));