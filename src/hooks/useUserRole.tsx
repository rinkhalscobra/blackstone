import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

type AppRole = 'admin' | 'group_admin' | 'supervisor' | 'agent' | 'user';

interface UserRoleData {
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isGroupAdmin: boolean;
  isSupervisor: boolean;
  isAgent: boolean;
  isUser: boolean;
  isStaff: boolean;
}

export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user');
        } else {
          setRole(data?.role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return {
    role,
    isLoading,
    isAdmin: role === 'admin',
    isGroupAdmin: role === 'group_admin',
    isSupervisor: role === 'supervisor',
    isAgent: role === 'agent',
    isUser: role === 'user' || role === null,
    isStaff: role === 'admin' || role === 'group_admin' || role === 'supervisor' || role === 'agent',
  };
};
