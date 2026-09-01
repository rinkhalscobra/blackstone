import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { useCustomerData } from '@/hooks/useCustomerData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const TransactionsPage = () => {
  const { transactions, isLoading } = useCustomerData();
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.id.toLowerCase().includes(query) ||
        tx.method.toLowerCase().includes(query) ||
        tx.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('transactions.title')}</h1>
          <p className="text-muted-foreground">{t('transactions.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('transactions.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t('transactions.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
              <SelectItem value="deposit">{t('transactions.deposits')}</SelectItem>
              <SelectItem value="withdraw">{t('transactions.withdrawals')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder={t('transactions.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('transactions.allStatus')}</SelectItem>
              <SelectItem value="pending">{t('transactions.pending')}</SelectItem>
              <SelectItem value="approved">{t('transactions.approved')}</SelectItem>
              <SelectItem value="rejected">{t('transactions.rejected')}</SelectItem>
              <SelectItem value="processing">{t('transactions.processing')}</SelectItem>
            </SelectContent>
          </Select>

          {(typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
            >
              {t('transactions.clearFilters')}
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {t('transactions.showing').replace('{filtered}', filteredTransactions.length.toString()).replace('{total}', transactions.length.toString())}
        </div>

        {/* Transaction List */}
        <TransactionList transactions={filteredTransactions} showAll />
      </div>
    </DashboardLayout>
  );
};

export default TransactionsPage;
