import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, flush } from './renderHook';

const mock = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn(), enabled: true, error: null as Error | null, updates: [] as unknown[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mock.toast }) }));
import { IPWhitelistToggle } from '@/components/admin/IPWhitelistToggle';
import { LanguageProvider } from '@/contexts/LanguageContext';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mock.enabled = true;
  mock.error = null;
  mock.updates = [];
  mock.from.mockImplementation(() => {
    let update: { enabled: boolean } | undefined;
    const query = {
      select: () => query, eq: () => query,
      update: (value: { enabled: boolean }) => { update = value; mock.updates.push(value); return query; },
      single: async () => {
        if (update && !mock.error) mock.enabled = update.enabled;
        return { data: { enabled: mock.enabled }, error: mock.error };
      },
    };
    return query;
  });
});

function mount() {
  return renderHook(() => null, () => <LanguageProvider><IPWhitelistToggle /></LanguageProvider>);
}

it('persists disabling and re-enabling without touching existing rules', async () => {
  mount();
  const toggle = document.querySelector<HTMLButtonElement>('[role="switch"]');
  expect(toggle.disabled).toBe(true);
  await flush();
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  act(() => toggle.click());
  await flush();
  expect(mock.updates).toEqual([{ enabled: false }]);
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  expect(document.body.textContent).toContain('All IP restrictions are off for every group');
  act(() => toggle.click());
  await flush();
  expect(mock.updates).toEqual([{ enabled: false }, { enabled: true }]);
  expect(mock.from.mock.calls.every(([table]) => table === 'ip_whitelist_settings')).toBe(true);
});

it('loads the saved off state after remounting', async () => {
  mock.enabled = false;
  mount();
  await flush();
  expect(document.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('false');
  expect(document.body.textContent).toContain('Existing rules are saved for later');
});

it('keeps the saved state and shows an error when an update fails', async () => {
  mount();
  await flush();
  mock.error = new Error('Permission denied');
  act(() => document.querySelector<HTMLButtonElement>('[role="switch"]').click());
  await flush();
  expect(document.querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true');
  expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
});

it('disables the switch after a failed load and supports retry', async () => {
  mock.error = new Error('Unavailable');
  mount();
  await flush();
  expect(document.querySelector<HTMLButtonElement>('[role="switch"]').disabled).toBe(true);
  expect(document.body.textContent).toContain('Could not load the IP whitelist setting');
  mock.error = null;
  act(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Retry')?.click());
  await flush();
  expect(document.querySelector<HTMLButtonElement>('[role="switch"]').disabled).toBe(false);
});
