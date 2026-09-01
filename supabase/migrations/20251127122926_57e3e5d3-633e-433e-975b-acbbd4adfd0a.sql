-- Create watchlist_items table
CREATE TABLE public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_id TEXT NOT NULL,
  crypto_name TEXT NOT NULL,
  crypto_symbol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, crypto_id)
);

-- Enable RLS on watchlist_items
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Watchlist items policies
CREATE POLICY "Users can view their own watchlist items"
  ON public.watchlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items"
  ON public.watchlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
  ON public.watchlist_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);