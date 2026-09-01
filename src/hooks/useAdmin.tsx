import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsGroupAdmin(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          setIsGroupAdmin(false);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
          setIsAdmin(data?.role === 'admin');
          setIsGroupAdmin(data?.role === 'group_admin');
        }
      } catch (err) {
        console.error('Error:', err);
        setIsAdmin(false);
        setIsGroupAdmin(false);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isGroupAdmin, userRole, loading };
};
