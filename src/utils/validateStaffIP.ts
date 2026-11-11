import { supabase } from '@/integrations/supabase/client';
import { getClientIPs } from '@/utils/getClientIP';

export async function validateStaffIP(user: { id: string; email?: string }): Promise<void> {
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError) throw new Error('Unable to verify staff access. Please try again.');
  if (!role || !['admin', 'group_admin', 'supervisor', 'agent'].includes(role.role)) return;

  const { data: settings, error: settingsError } = await supabase
    .from('ip_whitelist_settings')
    .select('enabled')
    .eq('id', 'global')
    .single();
  if (settingsError) throw new Error('Unable to load IP whitelist settings. Please try again.');
  if (!settings.enabled) return;

  const { ipv4, ipv6 } = await getClientIPs();
  const { data, error } = await supabase.functions.invoke('validate-staff-ip', {
    body: {
      user_id: user.id,
      email: user.email,
      client_ipv4: ipv4,
      client_ipv6: ipv6,
      user_agent: navigator.userAgent,
    },
  });
  if (error) throw new Error('Unable to validate your IP address. Please try again.');
  if (data?.allowed !== true) throw new Error(data?.reason || 'Your IP address is not allowed.');
}
