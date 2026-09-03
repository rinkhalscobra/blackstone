import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

interface CustomerBalance {
  id: string;
  currency: string;
  balance: number;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  case_number: string | null;
  status: string | null;
  case_phase: string | null;
  recovery_search_started_at: string | null;
  recovery_search_duration_minutes: number;
  recovery_search_scope: string;
  recovery_result_type: string | null;
  recovery_result_details: Json;
  recovery_completed_at: string | null;
  assigned_to: string | null;
  created_at: string | null;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  method: string;
  status: string;
  created_at: string;
  notes: string | null;
}

interface CaseTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export const useCustomerData = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CustomerBalance | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeline, setTimeline] = useState<CaseTimelineEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [balanceRes, profileRes, transactionsRes, timelineRes, notificationsRes] = await Promise.all([
        supabase.from('customer_balances').select('*').eq('customer_id', user.id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('transaction_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('case_timeline').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (balanceRes.data) setBalance(balanceRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
      if (timelineRes.data) setTimeline(timelineRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchData();

    // Set up realtime subscriptions (unique per hook instance to avoid collisions)
    const suffix = `${user.id}-${Math.random().toString(36).slice(2, 10)}`;

    const notificationsChannel = supabase
      .channel(`customer-notifications-${suffix}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    const transactionsChannel = supabase
      .channel(`customer-transactions-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_requests', filter: `customer_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTransactions(prev => [payload.new as Transaction, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTransactions(prev => prev.map(t => t.id === payload.new.id ? payload.new as Transaction : t));
        }
      })
      .subscribe();

    const balanceChannel = supabase
      .channel(`customer-balance-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_balances', filter: `customer_id=eq.${user.id}` }, (payload) => {
        setBalance(payload.new as CustomerBalance);
      })
      .subscribe();

    // Subscribe to profile updates (for case_phase changes)
    const profileChannel = supabase
      .channel(`customer-profile-${suffix}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        console.log('Profile updated:', payload);
        setProfile(payload.new as Profile);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const markNotificationRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    balance,
    profile,
    transactions,
    timeline,
    notifications,
    unreadCount,
    isLoading,
    markNotificationRead,
    refetch: fetchData,
  };
};
