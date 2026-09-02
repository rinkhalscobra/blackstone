import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface BalanceCardProps {
  balance: number;
}

export const BalanceCard = ({ balance }: BalanceCardProps) => {
  const { t } = useLanguage();
  
  const formattedBalance = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(balance);

  return (
    <Card className="h-full bg-gradient-to-br from-primary/20 via-card to-card border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('balance.accountBalance')}
        </CardTitle>
        <Wallet className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-4">
          {formattedBalance}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2">
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
