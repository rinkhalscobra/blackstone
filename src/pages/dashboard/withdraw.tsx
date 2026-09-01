import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WithdrawForm } from '@/components/dashboard/WithdrawForm';

const WithdrawPage = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <WithdrawForm />
      </div>
    </DashboardLayout>
  );
};

export default WithdrawPage;
