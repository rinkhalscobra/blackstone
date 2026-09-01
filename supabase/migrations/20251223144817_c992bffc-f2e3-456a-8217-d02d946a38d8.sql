-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false);

-- Storage policies for chat attachments
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view attachments they sent or received"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'agent'::app_role)
  )
);

-- Add attachment columns to messages table
ALTER TABLE public.messages
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_name TEXT,
ADD COLUMN attachment_type TEXT;