-- =============================================
-- SECURITY FIX: Group Isolation for Staff Access
-- =============================================

-- ===================
-- 1. customer_balances
-- ===================
DROP POLICY IF EXISTS "Staff can view all balances" ON customer_balances;

CREATE POLICY "Admins can view all balances" ON customer_balances
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group balances" ON customer_balances
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can view assigned customer balances" ON customer_balances
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = customer_id AND assigned_to = auth.uid())
);

-- ===================
-- 2. transaction_requests
-- ===================
DROP POLICY IF EXISTS "Staff can view all transaction requests" ON transaction_requests;

CREATE POLICY "Admins can view all transaction requests" ON transaction_requests
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group transaction requests" ON transaction_requests
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can view assigned customer transactions" ON transaction_requests
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = customer_id AND assigned_to = auth.uid())
);

-- ===================
-- 3. messages - Staff policies
-- ===================
DROP POLICY IF EXISTS "Staff can view messages" ON messages;
DROP POLICY IF EXISTS "Staff can send messages" ON messages;

CREATE POLICY "Admins can view all messages" ON messages
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group messages" ON messages
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  (is_same_group(auth.uid(), sender_id) OR is_same_group(auth.uid(), recipient_id))
);

CREATE POLICY "Agents can view assigned customer messages" ON messages
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = sender_id AND assigned_to = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = recipient_id AND assigned_to = auth.uid()) OR
    sender_id = auth.uid() OR recipient_id = auth.uid()
  )
);

CREATE POLICY "Admins can send messages" ON messages
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can send messages to group members" ON messages
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  auth.uid() = sender_id AND
  is_same_group(auth.uid(), recipient_id)
);

CREATE POLICY "Agents can send messages to assigned customers" ON messages
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND 
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM profiles WHERE id = recipient_id AND assigned_to = auth.uid())
);

-- ===================
-- 4. customer_notes
-- ===================
DROP POLICY IF EXISTS "Staff can manage customer notes" ON customer_notes;

CREATE POLICY "Admins can manage all customer notes" ON customer_notes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can manage group customer notes" ON customer_notes
FOR ALL USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can manage assigned customer notes" ON customer_notes
FOR ALL USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = customer_id AND assigned_to = auth.uid())
);

-- ===================
-- 5. case_timeline
-- ===================
DROP POLICY IF EXISTS "Staff can view all timelines" ON case_timeline;
DROP POLICY IF EXISTS "Staff can manage timelines" ON case_timeline;

CREATE POLICY "Admins can view all timelines" ON case_timeline
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group timelines" ON case_timeline
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can view assigned customer timelines" ON case_timeline
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = customer_id AND assigned_to = auth.uid())
);

CREATE POLICY "Admins can manage all timelines" ON case_timeline
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can manage group timelines" ON case_timeline
FOR ALL USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), customer_id)
);

CREATE POLICY "Agents can manage assigned customer timelines" ON case_timeline
FOR ALL USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = customer_id AND assigned_to = auth.uid())
);

-- ===================
-- 6. user_sessions
-- ===================
DROP POLICY IF EXISTS "Staff can view all sessions" ON user_sessions;

CREATE POLICY "Admins can view all sessions" ON user_sessions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group sessions" ON user_sessions
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), user_id)
);

CREATE POLICY "Agents can view assigned customer sessions" ON user_sessions
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND assigned_to = auth.uid())
);

-- ===================
-- 7. portfolio_items - Add staff read access
-- ===================
CREATE POLICY "Admins can view all portfolio items" ON portfolio_items
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can view group portfolio items" ON portfolio_items
FOR SELECT USING (
  has_role(auth.uid(), 'supervisor'::app_role) AND 
  is_same_group(auth.uid(), user_id)
);

CREATE POLICY "Agents can view assigned customer portfolio items" ON portfolio_items
FOR SELECT USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND assigned_to = auth.uid())
);

-- ===================
-- 8. Create a view for user_sessions that hides access_token for non-admins
-- ===================
CREATE OR REPLACE VIEW public.user_sessions_safe AS
SELECT 
  id,
  user_id,
  login_time,
  is_active,
  login_ip,
  user_agent,
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN access_token
    ELSE NULL
  END as access_token
FROM public.user_sessions;