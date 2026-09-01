import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react';
import { formatEuro } from '@/lib/utils';

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
  customer?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
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
  const { toast } = useToast();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('transaction_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Fetch customer details for each transaction
      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(t => t.customer_id))];
        const { data: customers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, assigned_to, group_id')
          .eq('is_archived', false)
          .in('id', customerIds);

        // Filter based on access and map customer data
        let filteredTransactions = data.map(t => {
          const customer = customers?.find(c => c.id === t.customer_id);
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
            (t as any)._assignedTo === user.id
          );
        } else if (groupId) {
          filteredTransactions = filteredTransactions.filter(t => 
            (t as any)._customerGroupId === groupId
          );
        }

        setTransactions(filteredTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, groupId, assignedOnly]);

  useEffect(() => {
    fetchTransactions();

    // Real-time subscription for transaction updates
    const channel = supabase
      .channel('pending-transactions')
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
  }, [fetchTransactions]);

  const handleAction = async (transactionId: string, action: 'approved' | 'rejected') => {
    setProcessingId(transactionId);
    try {
      const { error } = await supabase
        .from('transaction_requests')
        .update({
          status: action,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast({
        title: action === 'approved' 
          ? (t('customerDetail.transactionApproved') || 'Transaction Approved')
          : (t('customerDetail.transactionRejected') || 'Transaction Rejected'),
        description: action === 'approved' 
          ? 'Balance has been updated automatically.'
          : 'Transaction has been rejected.',
      });

      // Create notification for the customer
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        await supabase.from('notifications').insert({
          user_id: transaction.customer_id,
          type: action === 'approved' ? 'success' : 'error',
          title: action === 'approved' 
            ? `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Approved`
            : `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Rejected`,
          message: action === 'approved'
            ? `Your ${transaction.type} of ${formatEuro(transaction.amount)} has been approved.`
            : `Your ${transaction.type} request has been rejected. Please contact support for more information.`,
        });
      }

      fetchTransactions();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">{t('transactions.pending') || 'Pending Transactions'}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            {t('transactions.pending') || 'Pending Transactions'}
            <Badge variant="secondary">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('transactions.noPending') || 'No pending transactions'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {t('transactions.pending') || 'Pending Transactions'}
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            {transactions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              {/* Transaction Icon */}
              <div className={`p-2 rounded-lg flex-shrink-0 ${
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
                    {formatEuro(tx.amount)}
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
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => navigate(`/customer/${tx.customer_id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-400"
                  onClick={() => handleAction(tx.id, 'approved')}
                  disabled={processingId === tx.id}
                >
                  {processingId === tx.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Approve</span>
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400"
                  onClick={() => handleAction(tx.id, 'rejected')}
                  disabled={processingId === tx.id}
                >
                  {processingId === tx.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Reject</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingTransactions;
