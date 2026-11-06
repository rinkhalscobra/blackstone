import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useRoleQuery = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data?.role ?? null;
    },
    enabled: !!userId && !authLoading,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
  return { role: userId ? query.data ?? null : null, loading: authLoading || (!!userId && query.isPending) };
};
