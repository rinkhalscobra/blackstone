import { ArrowDownRight, ArrowUpRight, MessageSquareText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  method: string;
  status: string;
  created_at: string;
  notes: string | null;
  crypto_symbol?: string | null;
  quantity?: number | null;
  review_message?: string | null;
}


interface TransactionListProps {
  transactions: Transaction[];
  showAll?: boolean;
}

const formatMethod = (method: string) => {
  return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const TransactionList = ({ transactions, showAll = false }: TransactionListProps) => {
  const { t } = useLanguage();
  const displayTransactions = showAll ? transactions : transactions.slice(0, 10);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
      approved: { variant: 'default', className: 'bg-success text-success-foreground', label: t('transactions.approved') },
      rejected: { variant: 'destructive', className: '', label: t('transactions.rejected') },
      processing: { variant: 'secondary', className: 'bg-primary/20 text-primary', label: t('transactions.processing') },
      pending: { variant: 'outline', className: '', label: t('transactions.pending') },
    };
    
    const config = variants[status] || variants.pending;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('transactions.transactionHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ArrowDownRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('transactions.noTransactions')}</p>
            <p className="text-sm">{t('transactions.historyAppears')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayTransactions.map((tx) => (
              <div key={tx.id} className="rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    tx.type === 'deposit' ? 'bg-success/10' : 'bg-destructive/10'
                  )}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownRight className="h-6 w-6 text-success" />
                    ) : (
                      <ArrowUpRight className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-foreground capitalize">
                      {tx.type === 'deposit' ? t('transactions.deposits').slice(0, -1) : t('transactions.withdrawals').slice(0, -1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatMethod(tx.method)}
                      {tx.crypto_symbol && tx.quantity ? ` • ${tx.quantity} ${tx.crypto_symbol}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  </div>

                  <div className="ml-16 text-left sm:ml-0 sm:text-right">
                  <div className={cn(
                    "font-semibold text-lg",
                    tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                  )}>
                    {tx.type === 'deposit' ? '+' : '-'}
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: tx.currency || 'EUR',
                    }).format(tx.amount)}
                  </div>
                  <div className="mt-1">
                    {getStatusBadge(tx.status)}
                  </div>
                  </div>
                </div>
                {tx.review_message && tx.status !== 'pending' && (
                  <div className={cn(
                    "ml-0 mt-4 flex gap-3 rounded-md border p-3 text-sm sm:ml-16",
                    tx.status === 'approved' ? "border-green-500/25 bg-green-500/5" : "border-red-500/25 bg-red-500/5",
                  )}>
                    <MessageSquareText className={cn("mt-0.5 h-4 w-4 shrink-0", tx.status === 'approved' ? "text-green-400" : "text-red-400")} />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Message from your case team</p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{tx.review_message}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
