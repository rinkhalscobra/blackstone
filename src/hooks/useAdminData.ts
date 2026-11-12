import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const adminTabs = ['customers', 'transactions', 'agents', 'supervisors', 'admins', 'groups', 'promocodes', 'ip-whitelist', 'ip-audit'] as const;
export type AdminTab = typeof adminTabs[number];

// Keep cached sections within this page's lifetime, and scope every read to the account.
const queryOptions = { staleTime: 30_000, gcTime: 0, retry: false };

export function useAdminData(userId: string | undefined, enabled: boolean, tab: AdminTab) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['admin-data', userId], [userId]);
  const canLoad = enabled && !!userId && tab !== 'transactions';
  const directory = useQuery({
    ...queryOptions,
    queryKey: [...queryKey, 'directory'],
    enabled: canLoad,
    queryFn: async ({ signal }) => {
      const [profiles, roles, groups] = await Promise.all([
        supabase.from('profiles').select('id, email, first_name, last_name, username, phone, birthdate, status, group_id, created_by, assigned_to, last_login, is_super, created_at').eq('is_archived', false).neq('platform', 'chargeback').order('created_at', { ascending: false }).abortSignal(signal),
        supabase.from('user_roles').select('id, user_id, role, created_at').abortSignal(signal),
        supabase.from('groups').select('id, name, description, created_by, created_at, updated_at').neq('platform', 'chargeback').order('name').abortSignal(signal),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      if (groups.error) throw groups.error;
      return { users: profiles.data, userRoles: roles.data, groups: groups.data };
    },
  });

  const promocodesQuery = useQuery({
    ...queryOptions,
    queryKey: [...queryKey, 'promocodes'],
    enabled: canLoad && directory.isSuccess && tab === 'promocodes',
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('promocodes').select('id, code, group_id, role_type, is_active, usage_limit, times_used, expires_at, created_at').order('created_at', { ascending: false }).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const whitelistQuery = useQuery({
    ...queryOptions,
    queryKey: [...queryKey, 'ip-whitelist'],
    enabled: canLoad && directory.isSuccess && tab === 'ip-whitelist',
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('ip_whitelist').select('id, ip_address, ip_version, action, subject, group_id, created_at').order('created_at', { ascending: false }).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const logsQuery = useQuery({
    ...queryOptions,
    queryKey: [...queryKey, 'ip-audit'],
    enabled: canLoad && directory.isSuccess && tab === 'ip-audit',
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('ip_validation_logs').select('id, user_id, email, ipv4_address, ipv6_address, user_agent, action, reason, matched_rule_id, created_at').order('created_at', { ascending: false }).limit(100).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

  const users = useMemo(() => directory.data?.users ?? [], [directory.data]);
  const userRoles = useMemo(() => directory.data?.userRoles ?? [], [directory.data]);
  const groups = useMemo(() => directory.data?.groups ?? [], [directory.data]);
  // Preserve the existing exclusions for chargeback groups and hidden users.
  const visibleGroupIds = useMemo(() => new Set(groups.map(group => group.id)), [groups]);
  const visibleUserIds = useMemo(() => new Set(users.map(profile => profile.id)), [users]);
  const promocodes = useMemo(() => (promocodesQuery.data ?? []).filter(row => !row.group_id || visibleGroupIds.has(row.group_id)), [promocodesQuery.data, visibleGroupIds]);
  const ipWhitelist = useMemo(() => (whitelistQuery.data ?? []).filter(row => !row.group_id || visibleGroupIds.has(row.group_id)), [whitelistQuery.data, visibleGroupIds]);
  const ipLogs = useMemo(() => (logsQuery.data ?? []).filter(row => !row.user_id || visibleUserIds.has(row.user_id)), [logsQuery.data, visibleUserIds]);
  const section = tab === 'promocodes' ? promocodesQuery : tab === 'ip-whitelist' ? whitelistQuery : tab === 'ip-audit' ? logsQuery : null;
  const refresh = useCallback(async () => {
    // Inactive sections are marked stale without fetching them in the background.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ['pending-transactions', userId] }),
    ]);
  }, [queryClient, queryKey, userId]);

  return {
    users, userRoles, groups, promocodes, ipWhitelist, ipLogs, refresh,
    loading: canLoad && (directory.isPending || (!directory.isError && !!section?.isPending)),
    error: canLoad ? directory.error || section?.error : null,
  };
}
