import { ReactNode, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useLanguage } from '@/contexts/LanguageContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2 } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Backdrop } from '@/components/design/Backdrop';
import { WindowChrome } from '@/components/dashboard/WindowChrome';


interface StaffDashboardLayoutProps {
  role: 'admin' | 'group_admin' | 'supervisor' | 'agent';
  children: ReactNode;
  title: string;
  subtitle?: string;
  groupName?: string | null;
  headerActions?: ReactNode;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

const roleConfig = {
  admin: {
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    label: 'Super Admin',
  },
  group_admin: {
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    label: 'Group Admin',
  },
  supervisor: {
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    label: 'Supervisor',
  },
  agent: {
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Agent',
  },
};

export const StaffDashboardLayout = ({
  role,
  children,
  title,
  subtitle,
  groupName,
  headerActions,
  onRefresh,
  isLoading = false,
}: StaffDashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role: userRole, isLoading: roleLoading } = useUserRole();
  const { t } = useLanguage();

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && userRole) {
      // Check if user has the required role
      const hasAccess = 
        role === 'admin' ? userRole === 'admin' :
        role === 'group_admin' ? userRole === 'group_admin' || userRole === 'admin' :
        role === 'supervisor' ? userRole === 'supervisor' || userRole === 'group_admin' || userRole === 'admin' :
        role === 'agent' ? userRole === 'agent' || userRole === 'supervisor' || userRole === 'group_admin' || userRole === 'admin' :
        false;
      
      if (!hasAccess) {
        navigate('/');
      }
    }
  }, [roleLoading, userRole, role, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const config = roleConfig[role];

  const content = (
    <main className="container mx-auto px-4 py-6 sm:py-8">
      <WindowChrome title={`Blackstone Recovery — ${config.label}`}>
        <div className="p-5 sm:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-shiny">{title}</h1>
                  <Badge className={`${config.color} border`}>{config.label}</Badge>
                </div>
                {subtitle && (
                  <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
                )}
                {groupName && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {t('supervisor.managingGroup')}: <span className="text-primary font-medium">{groupName}</span>
                    </span>
                  </div>
                )}
              </div>
              {headerActions && (
                <div className="flex gap-2 flex-wrap">
                  {headerActions}
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            children
          )}
        </div>
      </WindowChrome>
    </main>
  );

  return (
    <div className="min-h-screen bg-transparent pt-16">
      <Backdrop />
      <Navigation />

      
      {onRefresh ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
          {content}
        </PullToRefresh>
      ) : (
        content
      )}

      <Footer />
    </div>
  );
};

export default StaffDashboardLayout;
