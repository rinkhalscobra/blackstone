import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClientPagination } from '@/hooks/useClientPagination';
import { CustomerPagination } from '@/components/CustomerPagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, ArrowUpRight, ArrowDownLeft, Eye, Search } from 'lucide-react';
import { TransactionPaymentDetailsDialog } from '@/components/admin/TransactionPaymentDetailsDialog';
import { TransactionReviewDialog } from '@/components/admin/TransactionReviewDialog';
import type { Json } from '@/integrations/supabase/types';

const formatTransactionAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'EUR' }).format(amount);

interface Transaction {
  id: string;
  customer_id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  method: string;
  status: string;
  created_at: string | null;
  crypto_symbol?: string | null;
  quantity?: number | null;
  payment_details: Json | null;
  payment_instructions_snapshot: Json | null;
  customer?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface EnrichedTransaction extends Transaction {
  _customerGroupId?: string | null;
  _assignedTo?: string | null;
}

interface PendingTransactionsProps {
  groupId?: string | null;
  assignedOnly?: boolean;
  className?: string;
}

export const PendingTransactions = ({
  groupId,
  assignedOnly = false,
  className,
}: PendingTransactionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [type, setType] = useState('all');
  const { data: transactions = [], isPending: loading, error, refetch } = useQuery({
    queryKey: ['pending-transactions', userId, groupId ?? null, assignedOnly],
    enabled: !!userId,
    staleTime: 15_000,
    // The realtime subscription is paused while its tab is closed.
    refetchOnMount: 'always',
    gcTime: 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const query = supabase
        .from('transaction_requests')
        .select('id, customer_id, type, amount, currency, method, status, created_at, crypto_symbol, quantity, payment_details, payment_instructions_snapshot')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }).abortSignal(signal);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch customer details for each transaction
      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(t => t.customer_id))];
        const { data: customers, error: customerError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, assigned_to, group_id')
          .eq('is_archived', false)
          .in('id', customerIds).abortSignal(signal);
        if (customerError) throw customerError;

        // Filter based on access and map customer data
        const customerById = new Map((customers || []).map(customer => [customer.id, customer]));
        let filteredTransactions: EnrichedTransaction[] = data.map(t => {
          const customer = customerById.get(t.customer_id);
          return {
            ...t,
            customer: customer ? {
              first_name: customer.first_name,
              last_name: customer.last_name,
              email: customer.email,
            } : undefined,
            _customerGroupId: customer?.group_id,
            _assignedTo: customer?.assigned_to,
          };
        });

        // Hide transactions whose customer is archived (customer lookup returns nothing)
        filteredTransactions = filteredTransactions.filter(t => t.customer !== undefined);

        // Apply filtering based on role
        if (assignedOnly) {
          filteredTransactions = filteredTransactions.filter(t => 
            t._assignedTo === userId
          );
        } else if (groupId) {
          filteredTransactions = filteredTransactions.filter(t => 
            t._customerGroupId === groupId
          );
        }

        return filteredTransactions;
      }
      return [];
    },
  });
  const fetchTransactions = useCallback(async () => {
    await refetch();
  }, [refetch]);
  const filteredTransactions = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return transactions.filter(tx => (type === 'all' || tx.type === type) && (!term ||
      `${tx.customer?.first_name || ''} ${tx.customer?.last_name || ''} ${tx.customer?.email || ''} ${tx.method} ${tx.currency} ${tx.amount}`.toLowerCase().includes(term)));
  }, [transactions, type, deferredSearch]);
  const pagination = useClientPagination(filteredTransactions, `${type}:${deferredSearch}`, 10);

  useEffect(() => {
    if (!userId) return;

    // Real-time subscription for transaction updates
    const channel = supabase
      .channel(`pending-transactions:${userId}:${groupId || 'all'}:${assignedOnly}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_requests',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions, userId, groupId, assignedOnly]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">{t('transactions.pending') || 'Pending Transactions'}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8" role="status" aria-label={t('common.loading')}>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center" role="alert">
          <p className="mb-3 text-muted-foreground">{t('common.error')}: {error.message}</p>
          <Button variant="outline" onClick={fetchTransactions}>{t('common.retry')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
        <CardTitle className="text-base flex items-center gap-2">
          {t('transactions.pending') || 'Pending Transactions'}
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            {transactions.length}
          </Badge>
        </CardTitle>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t('common.search')} placeholder={t('common.search')} value={search} onChange={event => setSearch(event.target.value)} className="h-9 pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-44" aria-label={t('transactions.allTypes')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
              <SelectItem value="deposit">{t('transactions.deposits')}</SelectItem>
              <SelectItem value="withdraw">{t('transactions.withdrawals')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {pagination.items.map((tx) => (
            <div
              key={tx.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              {/* Transaction Icon */}
              <div className={`p-2 rounded-lg flex-shrink-0 self-start sm:self-auto ${
                tx.type === 'deposit' 
                  ? 'bg-green-500/20' 
                  : 'bg-red-500/20'
              }`}>
                {tx.type === 'deposit' ? (
                  <ArrowDownLeft className="h-5 w-5 text-green-400" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-red-400" />
                )}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium capitalize">{tx.type}</span>
                  <span className="font-bold text-primary">
                    {formatTransactionAmount(tx.amount, tx.currency)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {tx.method.replace('_', ' ')}
                  </Badge>
                  {tx.crypto_symbol && tx.quantity ? (
                    <Badge variant="secondary" className="text-xs">
                      {tx.quantity} {tx.crypto_symbol}
                    </Badge>
                  ) : null}
                </div>

                <div className="text-sm text-muted-foreground truncate">
                  {tx.customer?.first_name} {tx.customer?.last_name} 
                  {tx.customer?.email && ` • ${tx.customer.email}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {tx.created_at && new Date(tx.created_at).toLocaleString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <TransactionPaymentDetailsDialog
                  transactionType={tx.type}
                  method={tx.method}
                  paymentDetails={tx.payment_details}
                  instructionSnapshot={tx.payment_instructions_snapshot}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => navigate(`/customer/${tx.customer_id}`)}
                  title="Open client record"
                  aria-label="Open client record"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <TransactionReviewDialog transaction={tx} action="approved" onReviewed={fetchTransactions}>
                  <Button size="sm" variant="outline" aria-label="Approve" className="h-8 w-8 p-0 sm:w-auto sm:px-3 border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300">
                    <Check className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Approve</span>
                  </Button>
                </TransactionReviewDialog>
                <TransactionReviewDialog transaction={tx} action="rejected" onReviewed={fetchTransactions}>
                  <Button size="sm" variant="outline" aria-label="Reject" className="h-8 w-8 p-0 sm:w-auto sm:px-3 border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300">
                    <X className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Reject</span>
                  </Button>
                </TransactionReviewDialog>
              </div>
            </div>
          ))}
        </div>
        {filteredTransactions.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{transactions.length === 0 ? t('transactions.noPending') : t('common.noResults')}</p>
        )}
      </CardContent>
      <CustomerPagination {...pagination} />
    </Card>
  );
};

export default PendingTransactions;
