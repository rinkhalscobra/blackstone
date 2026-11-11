// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  from: vi.fn(), handler: undefined as ((request: Request) => Promise<Response>) | undefined,
  enabled: false, ruleReads: 0,
  rules: [] as Array<{ id: string; ip_address: string; action: string; subject: string }>,
}));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({ createClient: () => ({ from: mock.from }) }));

beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: () => 'test' }, serve: (handler: typeof mock.handler) => { mock.handler = handler; } });
  await import('../supabase/functions/validate-staff-ip/index');
});

beforeEach(() => {
  mock.enabled = false;
  mock.ruleReads = 0;
  mock.rules = [];
  mock.from.mockImplementation((table: string) => {
    if (table === 'ip_whitelist') mock.ruleReads++;
    const result = () => ({
      data: table === 'user_roles' ? { role: 'agent' }
        : table === 'profiles' ? { group_id: 'office', email: 'staff@example.com' }
          : table === 'ip_whitelist_settings' ? { enabled: mock.enabled }
            : table === 'ip_whitelist' ? mock.rules : [],
      error: null,
    });
    const query = {
      select: () => query, eq: () => query, is: () => query,
      single: async () => result(), maybeSingle: async () => result(), insert: async () => result(),
      then: (resolve: (value: unknown) => void) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
});

async function validate() {
  const response = await mock.handler(new Request('http://localhost/validate-staff-ip', {
    method: 'POST', body: JSON.stringify({ user_id: 'staff', email: 'staff@example.com', client_ipv4: '192.0.2.1' }),
  }));
  expect(response.status).toBe(200);
  return response.json();
}

it('bypasses all rules, including explicit DENY rules, when disabled', async () => {
  mock.rules = [{ id: 'deny', ip_address: '*', action: 'DENY', subject: 'STAFF' }];
  expect(await validate()).toEqual({ allowed: true, reason: 'IP whitelist is disabled' });
  expect(mock.ruleReads).toBe(0);
});

it('continues rejecting explicit DENY rules when enabled', async () => {
  mock.enabled = true;
  mock.rules = [{ id: 'deny', ip_address: '*', action: 'DENY', subject: 'STAFF' }];
  expect((await validate()).allowed).toBe(false);
  expect(mock.ruleReads).toBe(2);
});

it('continues applying ALLOW rules when enabled', async () => {
  mock.enabled = true;
  mock.rules = [{ id: 'allow', ip_address: '192.0.2.1', action: 'ALLOW', subject: 'STAFF' }];
  expect((await validate()).allowed).toBe(true);
  mock.rules[0].ip_address = '192.0.2.2';
  expect((await validate()).allowed).toBe(false);
});
