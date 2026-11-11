import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  from: vi.fn(), invoke: vi.fn(), getClientIPs: vi.fn(),
  role: 'agent' as string | null, enabled: false, settingsError: null as Error | null,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from, functions: { invoke: mock.invoke } } }));
vi.mock('@/utils/getClientIP', () => ({ getClientIPs: mock.getClientIPs }));
import { validateStaffIP } from '@/utils/validateStaffIP';

beforeEach(() => {
  vi.clearAllMocks();
  mock.role = 'agent';
  mock.enabled = false;
  mock.settingsError = null;
  mock.from.mockImplementation((table: string) => {
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: mock.role ? { role: mock.role } : null, error: null }),
      single: async () => ({ data: { enabled: mock.enabled }, error: mock.settingsError }),
    };
    return query;
  });
  mock.getClientIPs.mockResolvedValue({ ipv4: '192.0.2.1', ipv6: '2001:db8::1' });
  mock.invoke.mockResolvedValue({ data: { allowed: true }, error: null });
});

describe('staff IP validation', () => {
  it.each(['admin', 'group_admin', 'supervisor', 'agent'])('skips IP lookup and validation for %s when disabled', async role => {
    mock.role = role;
    await validateStaffIP({ id: 'staff' });
    expect(mock.getClientIPs).not.toHaveBeenCalled();
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it.each(['user', null])('does not restrict customers with role %s', async role => {
    mock.role = role;
    mock.enabled = true;
    await validateStaffIP({ id: 'customer' });
    expect(mock.from).not.toHaveBeenCalledWith('ip_whitelist_settings');
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it('validates staff using both IP versions when enabled', async () => {
    mock.enabled = true;
    await validateStaffIP({ id: 'staff', email: 'staff@example.com' });
    expect(mock.invoke).toHaveBeenCalledWith('validate-staff-ip', {
      body: { user_id: 'staff', email: 'staff@example.com', client_ipv4: '192.0.2.1', client_ipv6: '2001:db8::1', user_agent: navigator.userAgent },
    });
  });

  it('rejects a denied IP with the server reason', async () => {
    mock.enabled = true;
    mock.invoke.mockResolvedValue({ data: { allowed: false, reason: 'IP address is explicitly denied' }, error: null });
    await expect(validateStaffIP({ id: 'staff' })).rejects.toThrow('IP address is explicitly denied');
  });

  it('does not treat a missing setting as disabled', async () => {
    mock.settingsError = new Error('Missing setting');
    await expect(validateStaffIP({ id: 'staff' })).rejects.toThrow('Unable to load IP whitelist settings');
    expect(mock.invoke).not.toHaveBeenCalled();
  });

  it('rejects unavailable or malformed validation responses', async () => {
    mock.enabled = true;
    mock.invoke.mockResolvedValue({ data: null, error: new Error('Unavailable') });
    await expect(validateStaffIP({ id: 'staff' })).rejects.toThrow('Unable to validate');
    mock.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(validateStaffIP({ id: 'staff' })).rejects.toThrow('Your IP address is not allowed');
  });
});
