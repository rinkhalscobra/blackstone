import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DepositForm } from '@/components/dashboard/DepositForm';

const DepositPage = () => {
  return (
    <DashboardLayout>
      <div className="w-full">
        <DepositForm />
      </div>
    </DashboardLayout>
  );
};

export default DepositPage;
