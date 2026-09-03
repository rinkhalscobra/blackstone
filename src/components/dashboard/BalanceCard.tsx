import { Wallet, ArrowUpRight, ArrowDownRight, Landmark, ChartPie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';

interface BalanceCardProps {
  cashValue: number | null;
  portfolioValue: number | null;
  totalValue: number | null;
  displayCurrency: string;
  isValuationLoading?: boolean;
}

export const BalanceCard = ({
  cashValue,
  portfolioValue,
  totalValue,
  displayCurrency,
  isValuationLoading = false,
}: BalanceCardProps) => {
  const { t } = useLanguage();

  const formatValue = (value: number | null) => {
    if (isValuationLoading) return '—';
    if (value === null) return t('balance.rateUnavailable');
    return formatCurrency(value, displayCurrency);
  };

  return (
    <Card className="h-full bg-gradient-to-br from-primary/20 via-card to-card border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('balance.totalAccountValue')}
        </CardTitle>
        <Wallet className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {formatValue(totalValue)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('balance.singleValueHint').replace('{currency}', displayCurrency)}
        </p>

        <div className="my-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-background/35 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Landmark className="h-3.5 w-3.5" />
              {t('balance.availableCash')}
            </div>
            <p className="font-semibold text-foreground">{formatValue(cashValue)}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/35 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <ChartPie className="h-3.5 w-3.5" />
              {t('balance.investments')}
            </div>
            <p className="font-semibold text-foreground">{formatValue(portfolioValue)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to="/dashboard/deposit">
              <ArrowDownRight className="mr-2 h-4 w-4" />
              {t('balance.deposit')}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to="/dashboard/withdraw">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t('balance.withdraw')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
