import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UnreadCounts {
  messages: number;
  notifications: number;
}

export const useUnreadCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!user) {
      setCounts({ messages: 0, notifications: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const [messagesRes, notificationsRes] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_read', false),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);

      setCounts({
        messages: messagesRes.count || 0,
        notifications: notificationsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();

    if (!user) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    // Subscribe to new notifications
    const notificationsChannel = supabase
      .channel('unread-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, fetchCounts]);

  return { ...counts, isLoading, refetch: fetchCounts };
};

export default useUnreadCounts;
