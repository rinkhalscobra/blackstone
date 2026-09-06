import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { RecoveryFundsPanel } from '@/components/dashboard/RecoveryFundsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerData } from '@/hooks/useCustomerData';

const RecoveryFundsPage = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useCustomerData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Located Funds</h1>
          <p className="mt-1 text-muted-foreground">Track amounts identified by your investigation and their recovery progress.</p>
        </div>
        {isLoading ? <Skeleton className="h-80" /> : (
          <RecoveryFundsPanel customerId={user?.id} casePhase={profile?.case_phase} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecoveryFundsPage;
