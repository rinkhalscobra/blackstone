import { useRoleQuery } from './useRoleQuery';
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
  const { role: savedRole, loading: isLoading } = useRoleQuery();
  const role: AppRole | null = user && !isLoading ? savedRole ?? 'user' : null;

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
