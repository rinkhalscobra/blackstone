import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({ user: { id: 'agent-a' }, from: vi.fn(), role: 'agent', error: null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user, loading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }));
import { useAdmin } from '@/hooks/useAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientPagination } from '@/hooks/useClientPagination';

beforeEach(() => {
  vi.clearAllMocks();
  mock.user = { id: 'agent-a' };
  mock.role = 'agent';
  mock.error = null;
  mock.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query, maybeSingle: () => Promise.resolve({ data: { role: mock.role }, error: mock.error }) };
    return query;
  });
});

describe('role checks', () => {
  const mount = () => {
    const client = new QueryClient();
    return renderHook(() => ({ admin: useAdmin(), role: useUserRole() }),
      children => <QueryClientProvider client={client}>{children}</QueryClientProvider>);
  };

  it('shares one query across the page, navigation, and layout', async () => {
    const result = mount();
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(1);
    expect(result.current.admin.userRole).toBe('agent');
    expect(result.current.role.isAgent).toBe(true);
    mock.user = { id: 'agent-a' };
    result.rerender();
    await flush();
    expect(mock.from).toHaveBeenCalledTimes(1);
  });

  it('never carries admin privileges into a new account', async () => {
    mock.role = 'admin';
    const result = mount();
    await flush();
    expect(result.current.admin.isAdmin).toBe(true);
    mock.user = { id: 'customer-b' };
    mock.role = 'user';
    result.rerender();
    expect(result.current.admin.isAdmin).toBe(false);
    await flush();
    expect(result.current.role.role).toBe('user');
  });

  it('does not grant staff privileges after a failed role query', async () => {
    mock.error = new Error('Unavailable');
    const result = mount();
    await flush();
    expect(result.current.role.isLoading).toBe(false);
    expect(result.current.role.isStaff).toBe(false);
    expect(result.current.admin.isAdmin).toBe(false);
  });
});

describe('CRM customer pagination', () => {
  it('keeps every result reachable and resets the page when search changes', () => {
    const all = Array.from({ length: 123 }, (_, index) => index);
    let items = all;
    let filter = '';
    const result = renderHook(() => useClientPagination(items, filter));
    expect(result.current.items).toHaveLength(50);
    act(() => result.current.setPage(2));
    expect(result.current.items).toEqual(all.slice(100));
    items = [105];
    filter = '105';
    result.rerender();
    expect(result.current.page).toBe(0);
    expect(result.current.items).toEqual([105]);
    items = all;
    filter = '';
    result.rerender();
    expect(result.current.page).toBe(0);
  });

  it('clamps the page after deletion and handles an empty result', () => {
    let items = Array.from({ length: 101 }, (_, index) => index);
    const result = renderHook(() => useClientPagination(items, ''));
    act(() => result.current.setPage(2));
    items = items.slice(0, 55);
    result.rerender();
    expect(result.current.page).toBe(1);
    expect(result.current.items).toHaveLength(5);
    items = [];
    result.rerender();
    expect(result.current.page).toBe(0);
    expect(result.current.items).toEqual([]);
  });
});
