import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({
  user: { id: 'admin-a' }, from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(),
  rows: {} as Record<string, Array<Record<string, unknown>>>,
  failures: {} as Record<string, Error>,
  realtime: null as null | (() => void),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/hooks/useAdmin', () => ({ useAdmin: () => ({ isAdmin: true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from, channel: mock.channel, removeChannel: mock.removeChannel } }));
vi.mock('@/components/dashboard/StaffDashboardLayout', () => ({ StaffDashboardLayout: ({ children, onRefresh }: { children: ReactNode; onRefresh: () => void }) => <main><button onClick={onRefresh}>Refresh dashboard</button>{children}</main> }));
vi.mock('@/components/admin/MFASetupDialog', () => ({ MFASetupDialog: () => null }));
vi.mock('@/components/admin/CreateGroupDialog', () => ({ CreateGroupDialog: () => null }));
vi.mock('@/components/admin/CreatePromocodeDialog', () => ({ CreatePromocodeDialog: () => null }));
vi.mock('@/components/admin/CreateIPWhitelistDialog', () => ({ CreateIPWhitelistDialog: () => null }));
vi.mock('@/components/admin/EditIPWhitelistDialog', () => ({ EditIPWhitelistDialog: () => null }));
vi.mock('@/components/admin/IPWhitelistToggle', () => ({ IPWhitelistToggle: () => null }));
vi.mock('@/components/admin/CreateUserDialog', () => ({ CreateUserDialog: () => null }));
vi.mock('@/components/admin/BulkCreateUsersDialog', () => ({ BulkCreateUsersDialog: () => null }));
vi.mock('@/components/admin/ConfiscateStaffDialog', () => ({ default: () => null }));
vi.mock('@/components/admin/CreateClientDialog', () => ({ CreateClientDialog: () => null }));
vi.mock('@/components/admin/EditStaffNameDialog', () => ({ EditStaffNameDialog: () => null }));
vi.mock('@/components/admin/DeleteUserDialog', () => ({ DeleteUserDialog: () => null }));
vi.mock('@/components/admin/AgentClientsDialog', () => ({ AgentClientsDialog: () => null }));
vi.mock('@/components/admin/TransactionPaymentDetailsDialog', () => ({ TransactionPaymentDetailsDialog: () => <button>Payment details</button> }));
vi.mock('@/components/admin/TransactionReviewDialog', () => ({ TransactionReviewDialog: ({ transaction, children }: { transaction: { id: string }; children: ReactNode }) => <span data-review-id={transaction.id}>{children}</span> }));

import Admin from '@/pages/Admin';
import { PendingTransactions } from '@/components/dashboard/PendingTransactions';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useAdminData, type AdminTab } from '@/hooks/useAdminData';

const profile = (index: number, extra = {}) => ({ id: `customer-${index}`, first_name: `Customer ${index}`, last_name: 'Example', email: `client${index}@example.test`, group_id: 'group-a', ...extra });
const requests = () => mock.from.mock.calls.map(([table]) => table);
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent === label)!;
const selectTab = (label: string) => act(() => {
  [...document.querySelectorAll('[role="tab"]')].find(element => element.textContent?.trim() === label)!
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
});
const search = (text: string) => act(() => {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
function Location() { return <output data-location>{useLocation().search}</output>; }
function mountPage(path = '/admin', child: ReactNode = <Admin />) {
  const client = new QueryClient();
  renderHook(() => null, () => <QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={[path]}><Location />{child}</MemoryRouter></LanguageProvider></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mock.user = { id: 'admin-a' };
  mock.rows = {
    profiles: Array.from({ length: 69 }, (_, index) => profile(index)),
    user_roles: [], groups: [{ id: 'group-a', name: 'Main group' }],
    promocodes: [{ id: 'promo-a', code: 'WELCOME', group_id: 'group-a', role_type: 'user' }],
    ip_whitelist: [], ip_validation_logs: [],
    transaction_requests: Array.from({ length: 24 }, (_, index) => ({ id: `request-${index}`, customer_id: `customer-${index}`, type: index % 2 ? 'deposit' : 'withdraw', amount: index + 100, currency: 'EUR', method: 'bank_transfer', status: 'pending' })),
  };
  mock.failures = {};
  mock.realtime = null;
  mock.from.mockImplementation((table: string) => {
    const query = {
      select: () => query, eq: () => query, neq: () => query, order: () => query, in: () => query, limit: () => query,
      abortSignal: () => query,
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve({ data: mock.rows[table] ?? [], error: mock.failures[table] ?? null }).then(resolve, reject),
    };
    return query;
  });
  mock.channel.mockImplementation(() => {
    const channel = { on: (_event: string, _filter: unknown, callback: () => void) => { mock.realtime = callback; return channel; }, subscribe: () => channel };
    return channel;
  });
});

describe('admin section navigation', () => {
  it('shows customers immediately without mounting transactions or fetching optional sections', async () => {
    mountPage();
    await flush();
    expect(requests().sort()).toEqual(['groups', 'profiles', 'user_roles']);
    expect(mock.channel).not.toHaveBeenCalled();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(document.body.textContent).toContain('1-25 / 69');
    expect(document.querySelectorAll('[role="tabpanel"][data-state="active"]')).toHaveLength(1);
    expect(document.body.textContent).not.toContain('Withdraw');
    act(() => button('Next').click());
    expect(document.body.textContent).toContain('26-50 / 69');
    search('client68@');
    await flush();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(document.body.textContent).toContain('Customer 68');
    search('');
    await flush();
    expect(document.body.textContent).toContain('1-25 / 69');
  });

  it('avoids formatting rows for inactive sections during customer searches', async () => {
    mock.rows.profiles.push(profile(100, { created_at: '2026-11-10T12:00:00Z' }));
    mock.rows.user_roles = [{ user_id: 'customer-100', role: 'admin' }];
    mock.rows.groups[0].updated_at = '2026-11-10T12:00:00Z';
    const formatDate = vi.spyOn(Date.prototype, 'toLocaleDateString');
    try {
      mountPage();
      await flush();
      expect(formatDate).not.toHaveBeenCalled();
      search('client1@');
      await flush();
      expect(formatDate).not.toHaveBeenCalled();
      selectTab('Admins');
      await flush();
      expect(formatDate).toHaveBeenCalledTimes(1);
    } finally {
      formatDate.mockRestore();
    }
  });

  it('loads only the selected section, caches tab switches, and preserves search/page during refresh', async () => {
    mountPage('/admin?keep=yes');
    await flush();
    act(() => button('Next').click());
    selectTab('Promocodes');
    await flush(); await flush();
    expect(requests().filter(table => table === 'promocodes')).toHaveLength(1);
    expect(requests()).not.toContain('ip_whitelist');
    expect(document.querySelector('[data-location]')?.textContent).toBe('?keep=yes&tab=promocodes');
    expect(document.body.textContent).toContain('WELCOME');
    selectTab('Customers');
    await flush();
    expect(document.body.textContent).toContain('26-50 / 69');
    expect(requests().filter(table => table === 'profiles')).toHaveLength(1);
    act(() => button('Refresh dashboard').click());
    await flush();
    expect(document.body.textContent).toContain('26-50 / 69');
    expect(requests().filter(table => table === 'profiles')).toHaveLength(2);
    expect(requests().filter(table => table === 'promocodes')).toHaveLength(1);
  });

  it('deep links to transactions without directory queries, paginates, and releases the realtime subscription when closed', async () => {
    mountPage('/admin?tab=transactions');
    await flush(); await flush();
    expect(requests()).toEqual(['transaction_requests', 'profiles']);
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(10);
    expect(document.body.textContent).toContain('1-10 / 24');
    act(() => button('Next').click());
    expect(document.body.textContent).toContain('11-20 / 24');
    expect(document.querySelector('[data-review-id]')?.getAttribute('data-review-id')).toBe('request-10');
    search('client23@');
    await flush();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(1);
    expect(document.querySelector('[data-review-id]')?.getAttribute('data-review-id')).toBe('request-23');
    selectTab('Customers');
    await flush();
    expect(mock.removeChannel).toHaveBeenCalledTimes(1);
    expect(document.querySelector('button[aria-label="Approve"]')).toBeNull();
  });

  it('keeps navigation usable on a section failure and retries that section', async () => {
    mock.failures.promocodes = new Error('Promocodes unavailable');
    mountPage('/admin?tab=promocodes');
    await flush(); await flush();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Promocodes unavailable');
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(9);
    delete mock.failures.promocodes;
    act(() => button('Retry').click());
    await flush();
    expect(document.body.textContent).toContain('WELCOME');
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('falls back to customers for an invalid tab link', async () => {
    mountPage('/admin?tab=missing');
    await flush();
    expect(document.querySelector('[role="tab"][data-state="active"]')?.textContent).toContain('Customers');
  });
});

describe('admin data isolation', () => {
  it('preserves the group/user exclusions and clears visible data on an account switch', async () => {
    mock.rows.promocodes.push({ id: 'hidden', code: 'HIDDEN', group_id: 'chargeback-group' });
    let tab: AdminTab = 'promocodes';
    let userId = 'admin-a';
    const client = new QueryClient();
    const result = renderHook(() => useAdminData(userId, true, tab), children => <QueryClientProvider client={client}>{children}</QueryClientProvider>);
    await flush(); await flush();
    expect(result.current.promocodes.map(row => row.code)).toEqual(['WELCOME']);
    mock.rows.profiles = [profile(100)];
    userId = 'admin-b';
    tab = 'customers';
    result.rerender();
    expect(result.current.users).toEqual([]);
    await flush();
    expect(result.current.users.map(row => row.id)).toEqual(['customer-100']);
  });
});

describe('pending transaction list', () => {
  it('retains filtering for assigned agents and hides missing customers', async () => {
    mock.rows.profiles = [profile(0, { assigned_to: 'admin-a' }), profile(1, { assigned_to: 'another-agent' })];
    mountPage('/agent', <PendingTransactions assignedOnly />);
    await flush(); await flush();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(1);
    expect(document.querySelector('[data-review-id]')?.getAttribute('data-review-id')).toBe('request-0');
  });

  it('isolates cached transactions by group and account', async () => {
    mock.rows.profiles = [profile(0), profile(1, { group_id: 'group-b' }), profile(2)];
    let groupId = 'group-a';
    const client = new QueryClient();
    const result = renderHook(() => null, () => <QueryClientProvider client={client}><LanguageProvider><MemoryRouter><PendingTransactions groupId={groupId} /></MemoryRouter></LanguageProvider></QueryClientProvider>);
    await flush(); await flush();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(2);
    groupId = 'group-b';
    result.rerender();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(0);
    await flush();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(1);
    expect(document.querySelector('[data-review-id]')?.getAttribute('data-review-id')).toBe('request-1');
    mock.user = { id: 'admin-b' };
    mock.rows.profiles = [];
    result.rerender();
    expect(document.querySelectorAll('button[aria-label="Approve"]')).toHaveLength(0);
    await flush();
    expect(document.body.textContent).toContain('No pending transactions');
  });

  it('refreshes after realtime updates, clamps pagination after removal, and reports lookup failures', async () => {
    mountPage('/admin?tab=transactions');
    await flush(); await flush();
    act(() => button('Next').click());
    act(() => button('Next').click());
    expect(document.body.textContent).toContain('21-24 / 24');
    mock.rows.transaction_requests = mock.rows.transaction_requests.slice(0, 11);
    act(() => mock.realtime!());
    await flush();
    expect(document.body.textContent).toContain('11-11 / 11');
    mock.failures.profiles = new Error('Customer lookup unavailable');
    act(() => mock.realtime!());
    await flush();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Customer lookup unavailable');
  });

  it('refreshes transactions through the dashboard refresh action', async () => {
    mountPage('/admin?tab=transactions');
    await flush(); await flush();
    mock.rows.transaction_requests = [];
    act(() => button('Refresh dashboard').click());
    await flush();
    expect(document.body.textContent).toContain('No pending transactions');
    expect(requests()).not.toContain('user_roles');
  });
});
