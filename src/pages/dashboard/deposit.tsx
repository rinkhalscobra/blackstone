import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DepositForm } from '@/components/dashboard/DepositForm';

const DepositPage = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <DepositForm />
      </div>
    </DashboardLayout>
  );
};

export default DepositPage;
