import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CustomerDataProvider } from '@/hooks/useCustomerData';

export default function CustomerDataOutlet() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background" aria-busy="true" />;

  // Remount on account changes so no data survives into another user's session.
  return <CustomerDataProvider key={user?.id ?? 'signed-out'}><Outlet /></CustomerDataProvider>;
}
