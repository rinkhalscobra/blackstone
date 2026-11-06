import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({ user: { id: 'customer-a' }, from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mock }));
import { CustomerDataProvider, useCustomerData } from '@/hooks/useCustomerData';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import CustomerDataOutlet from '@/components/dashboard/CustomerDataOutlet';

type Listener = { table: string; callback: (payload: Record<string, unknown>) => void };
let listeners: Listener[];
let subscriptionCallback: (status: string) => void;

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: 'customer-a' };
  listeners = [];
  mock.from.mockImplementation((table: string) => {
    let owner = '';
    const query = {
      select: () => query, order: () => query, not: () => query, single: () => query, update: () => query,
      eq: (_key: string, value: string) => { owner = value; return query; },
      then: (resolve: (result: unknown) => void) => Promise.resolve({
        data: table === 'profiles' ? { id: owner, first_name: owner, preferred_currency: 'EUR' }
          : table === 'customer_balances' ? [{ id: `balance-${owner}`, currency: 'EUR', balance: 125 }]
            : [], error: null,
      }).then(resolve),
    };
    return query;
  });
  mock.channel.mockImplementation(() => {
    const channel = {
      on: (_event: string, filter: { table: string }, callback: Listener['callback']) => {
        listeners.push({ table: filter.table, callback });
        return channel;
      }, subscribe: (callback: (status: string) => void) => { subscriptionCallback = callback; return channel; },
    };
    return channel;
  });
});

describe('shared customer data', () => {
  const mount = () => renderHook(() => [useCustomerData(), useCustomerData(), useCustomerData()],
    children => <CustomerDataProvider key={mock.user?.id ?? 'signed-out'}>{children}</CustomerDataProvider>);

  it('loads once for the layout, active screen, and nested form', async () => {
    const result = mount();
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(7);
    expect(mock.channel).toHaveBeenCalledTimes(1);
    expect(result.current[0]).toBe(result.current[1]);
    expect(result.current[1]).toBe(result.current[2]);
    expect(result.current[0].balance.balance).toBe(125);
    result.rerender();
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(7);
    expect(mock.channel).toHaveBeenCalledTimes(1);
  });

  it('keeps every consumer in sync for balance changes, notifications, and timeline events', async () => {
    const result = mount();
    await flush();
    act(() => {
      listeners.find(listener => listener.table === 'customer_balances').callback({ eventType: 'UPDATE', new: { id: 'balance-customer-a', currency: 'EUR', balance: 250 } });
      listeners.find(listener => listener.table === 'notifications').callback({ eventType: 'INSERT', new: { id: 'notice', is_read: false, created_at: '2026-11-05' } });
      listeners.find(listener => listener.table === 'case_timeline').callback({ eventType: 'INSERT', new: { id: 'event', title: 'Updated', created_at: '2026-11-05' } });
    });
    result.current.forEach(data => {
      expect(data.balance.balance).toBe(250);
      expect(data.unreadCount).toBe(1);
      expect(data.timeline[0].title).toBe('Updated');
    });
    await act(async () => { await result.current[0].markNotificationRead('notice'); });
    expect(result.current[2].unreadCount).toBe(0);
    act(() => listeners.find(listener => listener.table === 'customer_balances').callback({ eventType: 'DELETE', old: { id: 'balance-customer-a' } }));
    expect(result.current[0].balances).toEqual([]);
  });

  it('does not reload or recreate channels for a refreshed auth object', async () => {
    const result = mount();
    await flush();
    mock.user = { id: 'customer-a' };
    result.rerender();
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(7);
    expect(mock.removeChannel).not.toHaveBeenCalled();
  });

  it('retains data and subscriptions while navigating between dashboard routes', async () => {
    const result = renderHook(() => ({ data: useCustomerData(), navigate: useNavigate() }), children => (
      <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route element={<CustomerDataOutlet />}>
          <Route path="/dashboard" element={children} />
          <Route path="/dashboard/wallet" element={children} />
        </Route></Routes>
      </MemoryRouter>
    ));
    await flush();
    act(() => result.current.navigate('/dashboard/wallet'));
    await flush();
    expect(result.current.data.balance.balance).toBe(125);
    expect(mock.from).toHaveBeenCalledTimes(7);
    expect(mock.channel).toHaveBeenCalledTimes(1);
    expect(mock.removeChannel).not.toHaveBeenCalled();
  });

  it('clears previous account data and removes subscriptions on account changes', async () => {
    const result = mount();
    await flush();
    mock.user = { id: 'customer-b' };
    result.rerender();
    expect(result.current[0].profile).toBeNull();
    expect(result.current[0].balances).toEqual([]);
    expect(mock.removeChannel).toHaveBeenCalledTimes(1);
    await flush();
    expect(result.current[0].profile.id).toBe('customer-b');
    mock.user = null;
    result.rerender();
    expect(result.current[0].profile).toBeNull();
    expect(result.current[0].balances).toEqual([]);
  });

  it('refreshes missed data after reconnecting without clearing the current screen', async () => {
    const result = mount();
    await flush();
    act(() => subscriptionCallback('SUBSCRIBED'));
    expect(mock.from).toHaveBeenCalledTimes(7);
    act(() => subscriptionCallback('SUBSCRIBED'));
    expect(result.current[0].isLoading).toBe(false);
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(14);
    expect(mock.channel).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event('online')));
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(21);
  });
});
