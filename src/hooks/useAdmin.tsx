import { useRoleQuery } from './useRoleQuery';

export const useAdmin = () => {
  const { role: userRole, loading } = useRoleQuery();
  return { isAdmin: userRole === 'admin', isGroupAdmin: userRole === 'group_admin', userRole, loading };
};
