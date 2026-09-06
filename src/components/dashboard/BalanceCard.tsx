import { Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { BALANCE_CURRENCIES, balanceForCurrency, type CurrencyBalance } from '@/lib/balances';
import { CurrencyIcon } from '@/components/dashboard/CurrencyIcon';

interface BalanceCardProps {
  balances: CurrencyBalance[];
}

export const BalanceCard = ({ balances }: BalanceCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="h-full bg-gradient-to-br from-primary/20 via-card to-card border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('balance.availableCash')}
        </CardTitle>
        <Wallet className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BALANCE_CURRENCIES.map((currency) => (
            <div key={currency} className="rounded-lg border border-border/70 bg-background/35 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CurrencyIcon currency={currency} /> {currency}
              </div>
              <p className="font-semibold text-foreground">
                {formatCurrency(balanceForCurrency(balances, currency), currency)}
              </p>
            </div>
          ))}
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
