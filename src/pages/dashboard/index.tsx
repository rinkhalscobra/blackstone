import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { CaseStatusCard } from '@/components/dashboard/CaseStatusCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import PortfolioSummaryCard from '@/components/dashboard/PortfolioSummaryCard';
import { useCustomerData } from '@/hooks/useCustomerData';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useUserRole } from '@/hooks/useUserRole';

const DashboardIndex = () => {
  const navigate = useNavigate();
  const { role, isLoading: roleLoading, isStaff } = useUserRole();
  const { balance, profile, transactions, isLoading, refetch } = useCustomerData();
  const { t } = useLanguage();

  // Redirect staff to their respective dashboards
  useEffect(() => {
    if (!roleLoading && isStaff) {
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'group_admin') {
        navigate('/group-admin', { replace: true });
      } else if (role === 'supervisor') {
        navigate('/supervisor', { replace: true });
      } else if (role === 'agent') {
        navigate('/agent', { replace: true });
      }
    }
  }, [role, roleLoading, isStaff, navigate]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (isLoading || roleLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6">
        {/* Welcome Header */}
        <div className="relative">
          <div className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-2xl" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-shiny">
            {t('dashboard.welcomeBack')}{profile?.first_name ? `, ${profile.first_name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.overview')}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <BalanceCard balance={balance?.balance || 0} />

          {/* Case Status */}
          <CaseStatusCard 
            caseNumber={profile?.case_number || null}
            status={profile?.status || null}
            casePhase={profile?.case_phase || null}
          />

          {/* Quick Actions */}
          <QuickActionsCard />
        </div>

        {/* Recent Activity & Portfolio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivityCard transactions={transactions} />
          <PortfolioSummaryCard />
        </div>
        
        {/* Info Card */}
        <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-lg border border-primary/20 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t('dashboard.needHelp')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('dashboard.needHelpDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              <span className="text-muted-foreground">{t('dashboard.support247')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              <span className="text-muted-foreground">{t('dashboard.secureDocSharing')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              <span className="text-muted-foreground">{t('dashboard.realtimeUpdates')}</span>
            </div>
          </div>
        </div>
        </div>
      </PullToRefresh>
    </DashboardLayout>
  );
};

export default DashboardIndex;
