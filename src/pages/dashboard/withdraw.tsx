import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WithdrawForm } from '@/components/dashboard/WithdrawForm';

const WithdrawPage = () => {
  return (
    <DashboardLayout>
      <div className="w-full">
        <WithdrawForm />
      </div>
    </DashboardLayout>
  );
};

export default WithdrawPage;
