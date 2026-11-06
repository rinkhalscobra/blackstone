-- Additive indexes for the existing customer and CRM reads. No data or RLS changes.
CREATE INDEX IF NOT EXISTS profiles_active_group_created_idx
  ON public.profiles (group_id, created_at DESC) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS profiles_active_assigned_created_idx
  ON public.profiles (assigned_to, created_at DESC) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS transaction_requests_customer_created_idx
  ON public.transaction_requests (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transaction_requests_pending_created_idx
  ON public.transaction_requests (created_at DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS customer_notes_customer_created_idx
  ON public.customer_notes (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_timeline_customer_created_idx
  ON public.case_timeline (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS portfolio_items_user_idx
  ON public.portfolio_items (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_user_login_idx
  ON public.user_sessions (user_id, login_time DESC);
