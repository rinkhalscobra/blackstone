import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UnreadCounts {
  messages: number;
  notifications: number;
}

export const useUnreadCounts = ({ includeNotifications = true }: { includeNotifications?: boolean } = {}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!userId) {
      setCounts({ messages: 0, notifications: 0 });
      setIsLoading(false);
      return;
    }

    try {
      const [messagesRes, notificationsRes] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', userId)
          .eq('is_read', false),
        includeNotifications ? supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false) : Promise.resolve({ count: 0 }),
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
  }, [userId, includeNotifications]);

  useEffect(() => {
    fetchCounts();

    if (!userId) return;

    let refreshTimer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void fetchCounts(); }, 100);
    };

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        scheduleRefresh
      )
      .subscribe();

    // Subscribe to new notifications
    const notificationsChannel = includeNotifications ? supabase
      .channel('unread-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh
      )
      .subscribe() : null;

    return () => {
      clearTimeout(refreshTimer);
      supabase.removeChannel(messagesChannel);
      if (notificationsChannel) supabase.removeChannel(notificationsChannel);
    };
  }, [userId, fetchCounts, includeNotifications]);

  return { ...counts, isLoading, refetch: fetchCounts };
};

export default useUnreadCounts;
