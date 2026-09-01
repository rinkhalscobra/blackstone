import { ArrowDownRight, ArrowUpRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface RecentActivityCardProps {
  transactions: Transaction[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export const RecentActivityCard = ({ transactions }: RecentActivityCardProps) => {
  const { t } = useLanguage();
  const recentTransactions = transactions.slice(0, 5);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return t('transactions.approved');
      case 'rejected': return t('transactions.rejected');
      case 'processing': return t('transactions.processing');
      default: return t('transactions.pending');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('dashboard.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('dashboard.noRecentActivity')}
          </div>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tx.type === 'deposit' ? 'bg-success/10' : 'bg-destructive/10'
                  )}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownRight className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground capitalize">
                      {tx.type === 'deposit' ? t('transactions.deposits').slice(0, -1) : t('transactions.withdrawals').slice(0, -1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "font-medium",
                    tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                  )}>
                    {tx.type === 'deposit' ? '+' : '-'}
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(tx.amount)}
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    {getStatusIcon(tx.status)}
                    <span className="text-xs text-muted-foreground capitalize">
                      {getStatusLabel(tx.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
