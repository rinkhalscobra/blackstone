import { act, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), toast: vi.fn(), t: (key: string) => key,
  user: { id: 'group-admin' },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock('@/hooks/useRoleQuery', () => ({ useRoleQuery: () => ({ role: 'group_admin', loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mock.t, language: 'en' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mock }));
vi.mock('@/components/dashboard/StaffDashboardLayout', () => ({ StaffDashboardLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/dashboard/PendingTransactions', () => ({ PendingTransactions: () => null }));
import GroupAdmin from '@/pages/GroupAdmin';

const customers = Array.from({ length: 125 }, (_, i) => ({ id: `customer-${i}`, first_name: `Customer${i}`, group_id: 'group', assigned_to: 'agent-0' }));
const agents = Array.from({ length: 10 }, (_, i) => ({ id: `agent-${i}`, first_name: `Agent${i}`, group_id: 'group' }));
const pending: Array<() => void> = [];
let active = 0;
let maxActive = 0;

beforeEach(() => {
  vi.clearAllMocks();
  pending.length = 0;
  active = maxActive = 0;
  mock.from.mockImplementation((table: string) => {
    let single = false;
    const query = {
      select: () => query, eq: () => query, in: () => query, order: () => query,
      single: () => { single = true; return query; },
      then: (resolve: (result: unknown) => void) => Promise.resolve({
        data: table === 'profiles' ? (single ? { group_id: 'group' } : [...customers, ...agents])
          : table === 'groups' ? { id: 'group', name: 'Test group' }
            : table === 'user_roles' ? agents.map(agent => ({ user_id: agent.id, role: 'agent' })) : [], error: null,
      }).then(resolve),
    };
    return query;
  });
  mock.rpc.mockImplementation((_name: string, { target_user_id }: { target_user_id: string }) => {
    active++;
    maxActive = Math.max(active, maxActive);
    return new Promise(resolve => pending.push(() => {
      active--;
      resolve({ data: [{ id: target_user_id, user_id: target_user_id, login_time: '2026-11-05', is_active: true }], error: null });
    }));
  });
});

function mount() {
  renderHook(() => null, () => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><GroupAdmin /></MemoryRouter>);
}

it('renders customer pages without fetching session history and keeps all customers reachable', async () => {
  mount();
  await flush();
  expect(mock.toast).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(document.querySelectorAll('tbody tr')).toHaveLength(50);
  expect(document.body.textContent).toContain('Customer0');
  const next = [...document.querySelectorAll('button')].find(button => button.textContent === 'common.next');
  act(() => next.click());
  expect(document.body.textContent).toContain('Customer50');
  expect(document.body.textContent).not.toContain('Customer0');
  act(() => next.click());
  expect(document.querySelectorAll('tbody tr')).toHaveLength(25);
  expect(document.body.textContent).toContain('Customer124');
});

it('loads staff sessions only when opened, with at most four concurrent RPCs', async () => {
  mount();
  await flush();
  const tab = document.querySelector<HTMLButtonElement>('[role="tab"][id$="trigger-sessions"]');
  act(() => tab.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
  await flush();
  expect(mock.rpc).toHaveBeenCalledTimes(4);
  for (let batch = 0; batch < 3; batch++) {
    await act(async () => { pending.splice(0).forEach(resolve => resolve()); });
    await flush();
  }
  expect(mock.rpc).toHaveBeenCalledTimes(10);
  expect(maxActive).toBe(4);
  expect(document.querySelectorAll('tbody tr')).toHaveLength(10);
  expect(document.body.textContent).toContain('Agent9');
});
