import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Attachment {
  url: string;
  name: string;
  type: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

// Helper to parse attachments from message (supports both single and multiple)
export const parseAttachments = (message: Message): Attachment[] => {
  if (!message.attachment_url) return [];
  
  try {
    // Try parsing as JSON array first
    const urls = JSON.parse(message.attachment_url) as string[];
    const names = message.attachment_name ? JSON.parse(message.attachment_name) as string[] : [];
    const types = message.attachment_type ? JSON.parse(message.attachment_type) as string[] : [];
    
    return urls.map((url, i) => ({
      url,
      name: names[i] || 'Attachment',
      type: types[i] || 'application/octet-stream',
    }));
  } catch {
    // Single attachment (legacy format)
    return [{
      url: message.attachment_url,
      name: message.attachment_name || 'Attachment',
      type: message.attachment_type || 'application/octet-stream',
    }];
  }
};

export const useMessages = (conversationId: string | null, recipientId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialLoad = useRef(true);

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  }, []);

  useEffect(() => {
    if (!user || !conversationId) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
      }
      setIsLoading(false);
      isInitialLoad.current = false;
    };

    fetchMessages();

    // Mark messages as read
    if (recipientId !== user.id) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .then(() => {});
    }

    // Set up realtime subscription with unique channel name
    const channelName = `messages-realtime-${conversationId}-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Realtime message received:', payload);
          const newMessage = payload.new as Message;
          // Only add if it's for this conversation
          if (newMessage.conversation_id !== conversationId) return;
          
          // Avoid duplicates
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Play notification sound and show toast for messages from others
          if (newMessage.sender_id !== user.id && !isInitialLoad.current) {
            playNotificationSound();
            toast({
              title: 'New Message',
              description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
            });
          }
          
          // Mark as read if we're the recipient
          if (newMessage.recipient_id === user.id) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
              .then(() => {});
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId, recipientId, playNotificationSound, toast]);

  // Upload a single file with progress tracking
  const uploadSingleFile = useCallback(
    async (file: File, index: number, totalFiles: number): Promise<Attachment | null> => {
      if (!user) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-attachments/${fileName}`;
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const fileProgress = Math.round((event.loaded / event.total) * 100);
            
            setUploadProgress(prev => prev.map((p, i) => 
              i === index ? { ...p, progress: fileProgress, status: 'uploading' as const } : p
            ));
            
            // Calculate overall progress
            setUploadProgress(prev => {
              const totalProgress = prev.reduce((sum, p) => sum + p.progress, 0);
              setOverallProgress(Math.round(totalProgress / totalFiles));
              return prev;
            });
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(prev => prev.map((p, i) => 
              i === index ? { ...p, progress: 100, status: 'complete' as const } : p
            ));
            resolve({
              url: fileName,
              name: file.name,
              type: file.type,
            });
          } else {
            setUploadProgress(prev => prev.map((p, i) => 
              i === index ? { ...p, status: 'error' as const, error: `Upload failed with status ${xhr.status}` } : p
            ));
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          setUploadProgress(prev => prev.map((p, i) => 
            i === index ? { ...p, status: 'error' as const, error: 'Upload failed' } : p
          ));
          reject(new Error('Upload failed'));
        });
        
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.send(file);
      });
    },
    [user]
  );

  // Upload multiple files
  const uploadAttachments = useCallback(
    async (files: File[]): Promise<Attachment[]> => {
      if (!user || files.length === 0) return [];
      
      setIsUploading(true);
      setOverallProgress(0);
      setUploadProgress(files.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
      })));

      const results: Attachment[] = [];
      
      try {
        // Upload files sequentially to show individual progress
        for (let i = 0; i < files.length; i++) {
          const result = await uploadSingleFile(files[i], i, files.length);
          if (result) {
            results.push(result);
          }
        }
        
        return results;
      } catch (error) {
        console.error('Error uploading files:', error);
        throw error;
      } finally {
        setIsUploading(false);
        setOverallProgress(0);
        setUploadProgress([]);
      }
    },
    [user, uploadSingleFile]
  );

  // Legacy single file upload (for backwards compatibility)
  const uploadAttachment = useCallback(
    async (file: File): Promise<Attachment | null> => {
      const results = await uploadAttachments([file]);
      return results[0] || null;
    },
    [uploadAttachments]
  );

  // Generate a signed URL for accessing private bucket files
  const getSignedUrl = useCallback(
    async (filePath: string): Promise<string | null> => {
      if (!filePath) return null;
      // Already a full URL (legacy data)
      if (filePath.startsWith('http')) return filePath;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      return data.signedUrl;
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!user || !conversationId || !recipientId) return;
      if (!content.trim() && (!attachments || attachments.length === 0)) return;

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;

      if (attachments && attachments.length > 0) {
        if (attachments.length === 1) {
          // Single attachment - store as simple strings
          attachmentUrl = attachments[0].url;
          attachmentName = attachments[0].name;
          attachmentType = attachments[0].type;
        } else {
          // Multiple attachments - store as JSON arrays
          attachmentUrl = JSON.stringify(attachments.map(a => a.url));
          attachmentName = JSON.stringify(attachments.map(a => a.name));
          attachmentType = JSON.stringify(attachments.map(a => a.type));
        }
      }

      const messageContent = content.trim() || 
        (attachments && attachments.length > 0 
          ? `📎 ${attachments.length} file${attachments.length > 1 ? 's' : ''} attached` 
          : '');

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: messageContent,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        attachment_type: attachmentType,
      });

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    [user, conversationId, recipientId]
  );

  return {
    messages,
    isLoading,
    isUploading,
    uploadProgress,
    overallProgress,
    sendMessage,
    uploadAttachment,
    uploadAttachments,
    getSignedUrl,
  };
};
