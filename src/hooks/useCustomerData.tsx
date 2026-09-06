import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';
import { normalizeBalanceCurrency } from '@/lib/balances';

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
  preferred_currency: string | null;
  display_currency: string;
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
  review_message: string | null;
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
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeline, setTimeline] = useState<CaseTimelineEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [balanceRes, profileRes, transactionsRes, timelineRes, notificationsRes] = await Promise.all([
        supabase.from('customer_balances').select('*').eq('customer_id', user.id).order('currency'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('transaction_requests').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('case_timeline').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (balanceRes.data) setBalances(balanceRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
      if (timelineRes.data) setTimeline(timelineRes.data);
      if (notificationsRes.data) setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
        if (payload.eventType === 'DELETE') {
          const removed = payload.old as Pick<CustomerBalance, 'id'>;
          setBalances((current) => current.filter((balance) => balance.id !== removed.id));
          return;
        }

        const changed = payload.new as CustomerBalance;
        setBalances((current) => {
          const exists = current.some((balance) => balance.id === changed.id);
          return exists
            ? current.map((balance) => balance.id === changed.id ? changed : balance)
            : [...current, changed].sort((a, b) => a.currency.localeCompare(b.currency));
        });
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
  }, [user, fetchData]);

  const markNotificationRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const selectedCurrency = normalizeBalanceCurrency(profile?.preferred_currency || profile?.display_currency);
  const balance = useMemo(
    () => balances.find((item) => item.currency.toUpperCase() === selectedCurrency) || balances[0] || null,
    [balances, selectedCurrency],
  );

  return {
    balance,
    balances,
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
