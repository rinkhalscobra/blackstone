-- Create messages table for customer-agent chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Customers can view messages where they are sender or recipient
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Customers can send messages to their assigned agent
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read
CREATE POLICY "Users can update read status"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Staff can view all messages for customers they manage
CREATE POLICY "Staff can view messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role)
);

-- Staff can send messages
CREATE POLICY "Staff can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role) OR 
  has_role(auth.uid(), 'agent'::app_role)
);

-- Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Create index for faster queries
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_recipient_unread ON public.messages(recipient_id, is_read) WHERE is_read = false;