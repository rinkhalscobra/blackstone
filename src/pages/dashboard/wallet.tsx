import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { useCustomerData } from '@/hooks/useCustomerData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAccountValuation } from '@/hooks/useAccountValuation';

const WalletPage = () => {
  const { balance, profile, transactions, isLoading } = useCustomerData();
  const { user } = useAuth();
  const { t } = useLanguage();

  const balanceCurrency = (balance?.currency || 'USD').toUpperCase();
  const displayCurrency = (
    profile?.preferred_currency || profile?.display_currency || balanceCurrency
  ).toUpperCase();
  const account = useAccountValuation({
    userId: user?.id,
    cashBalance: balance?.balance || 0,
    cashCurrency: balanceCurrency,
    displayCurrency,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate stats
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'approved' && t.currency.toUpperCase() === balanceCurrency)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdraw' && t.status === 'approved' && t.currency.toUpperCase() === balanceCurrency)
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('wallet.title')}</h1>
          <p className="text-muted-foreground">{t('wallet.subtitle')}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BalanceCard
            cashValue={account.cashValue}
            portfolioValue={account.portfolioValue}
            totalValue={account.totalAccountValue}
            displayCurrency={displayCurrency}
            isValuationLoading={account.isLoading}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('wallet.totalDeposits')}
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                +{formatCurrency(totalDeposits, balanceCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('wallet.approvedDeposits')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('wallet.totalWithdrawals')}
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -{formatCurrency(totalWithdrawals, balanceCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('wallet.approvedWithdrawals')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pending indicator */}
        {pendingTransactions > 0 && (
          <div className="flex items-center gap-2 p-4 bg-secondary/50 rounded-lg border border-border">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {t('wallet.pendingTransactions').replace('{count}', pendingTransactions.toString())}
            </span>
          </div>
        )}

        {/* Recent Transactions */}
        <TransactionList transactions={transactions.slice(0, 10)} />
      </div>
    </DashboardLayout>
  );
};

export default WalletPage;
