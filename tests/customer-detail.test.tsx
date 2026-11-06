import { act } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({
  from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(), toast: vi.fn(),
  t: (key: string) => key, user: { id: 'staff' }, holdAgents: false,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mock.user, loading: false }) }));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ isAdmin: true, isGroupAdmin: false, isSupervisor: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mock.t, language: 'en' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mock }));
vi.mock('@/components/Navigation', () => ({ default: () => null }));
vi.mock('@/components/Footer', () => ({ default: () => null }));
import CustomerDetail from '@/pages/CustomerDetail';

type Payload = { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> };
let listeners: Map<string, (payload: Payload) => void>;
const profile = (id: string) => ({ id, first_name: id, last_name: 'Client', email: `${id}@example.com`, group_id: 'group', case_phase: 'submitted', created_at: '2026-11-05', status: 'active', assigned_to: null });

beforeEach(() => {
  vi.clearAllMocks();
  mock.holdAgents = false;
  listeners = new Map();
  mock.from.mockImplementation((table: string) => {
    let owner = '';
    let single = false;
    let insert: Record<string, unknown>;
    const query = {
      select: () => query, order: () => query, limit: () => query, in: () => query,
      eq: (key: string, value: string) => { if (key === 'id') owner = value; return query; },
      single: () => { single = true; return query; },
      insert: (data: Record<string, unknown>) => { insert = data; return query; },
      then: (resolve: (result: unknown) => void) => {
        if (table === 'user_roles' && mock.holdAgents) return new Promise(() => undefined);
        return Promise.resolve({ data: insert ? { ...insert, id: 'note-1', created_at: '2026-11-05' }
          : table === 'profiles' && single ? profile(owner) : [], error: null }).then(resolve);
      },
    };
    return query;
  });
  mock.channel.mockImplementation(() => {
    const channel = {
      on: (_event: string, filter: { table: string }, callback: (payload: Payload) => void) => { listeners.set(filter.table, callback); return channel; },
      subscribe: () => channel,
    };
    return channel;
  });
});

function mount() {
  return renderHook(() => useNavigate(), children => (
    <MemoryRouter initialEntries={['/customer/customer-a']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes><Route path="/customer/:customerId" element={<>{children}<CustomerDetail /></>} /></Routes>
    </MemoryRouter>
  ));
}

it('shows the customer without waiting for the agent picker and uses one channel', async () => {
  mock.holdAgents = true;
  mount();
  await flush();
  expect(document.body.textContent).toContain('customer-a Client');
  expect(document.querySelector('[role="tab"]')).not.toBeNull();
  expect(mock.channel).toHaveBeenCalledTimes(1);
});

it('saves a note with one request and preserves the active screen', async () => {
  mount();
  await flush();
  const before = mock.from.mock.calls.length;
  const textarea = document.querySelector('textarea');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'New case note');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'customerDetail.addNote');
  expect(button.disabled).toBe(false);
  act(() => button.click());
  await flush();
  expect(mock.from.mock.calls.length - before).toBe(1);
  expect(document.body.textContent).toContain('New case note');
  expect(document.querySelector('[role="tab"][data-state="active"]').textContent).toContain('customerDetail.profile');
  act(() => listeners.get('customer_notes')({ eventType: 'INSERT', new: { id: 'note-1', content: 'New case note', created_at: '2026-11-05' } }));
  expect(document.body.textContent.match(/New case note/g)).toHaveLength(1);
});

it('applies note and notification events without reloading the customer', async () => {
  mount();
  await flush();
  const before = mock.from.mock.calls.length;
  act(() => listeners.get('customer_notes')({ eventType: 'INSERT', new: { id: 'remote-note', content: 'Remote update', created_at: '2026-11-05' } }));
  expect(document.body.textContent).toContain('Remote update');
  act(() => listeners.get('customer_notes')({ eventType: 'DELETE', old: { id: 'remote-note' } }));
  expect(document.body.textContent).not.toContain('Remote update');
  act(() => listeners.get('notifications')({ eventType: 'INSERT', new: { id: 'notice', title: 'Live notice', type: 'info', created_at: '2026-11-05' } }));
  const tab = document.querySelector('[role="tab"][id$="trigger-notifications"]');
  act(() => tab.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
  expect(document.body.textContent).toContain('Live notice');
  expect(mock.from).toHaveBeenCalledTimes(before);
});

it('resets data and subscriptions when opening another customer', async () => {
  const result = mount();
  await flush();
  act(() => result.current('/customer/customer-b'));
  expect(document.body.textContent).not.toContain('customer-a Client');
  await flush();
  expect(document.body.textContent).toContain('customer-b Client');
  expect(mock.removeChannel).toHaveBeenCalledTimes(1);
});

it('refreshes only timeline events when the open case timeline changes', async () => {
  mount();
  await flush();
  const tab = document.querySelector('[role="tab"][id$="trigger-case"]');
  act(() => tab.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
  await flush();
  const before = mock.from.mock.calls.length;
  act(() => listeners.get('case_timeline')({ eventType: 'INSERT', new: { id: 'event' } }));
  await flush();
  expect(mock.from.mock.calls.slice(before).map(([table]) => table)).toEqual(['case_timeline']);
  expect(document.querySelector('[role="tab"][data-state="active"]').id).toContain('trigger-case');
});
