import { useNavigate } from 'react-router-dom';
import { PieChart, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import type { PortfolioHolding } from '@/hooks/useAccountValuation';

interface ValuedHolding extends PortfolioHolding {
  currentValue: number | null;
}

interface PortfolioSummaryCardProps {
  items: ValuedHolding[];
  totalValue: number | null;
  totalInvested: number | null;
  displayCurrency: string;
  isLoading?: boolean;
}

const PortfolioSummaryCard = ({
  items,
  totalValue,
  totalInvested,
  displayCurrency,
  isLoading = false,
}: PortfolioSummaryCardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const getTopHoldings = () => {
    return items
      .filter((item) => item.currentValue !== null)
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
      .slice(0, 3);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="h-5 w-5 text-primary" />
            {t('portfolio.myPortfolio')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            {t('portfolio.portfolioEmpty')}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/portfolio')}
          >
            {t('portfolio.createYourPortfolio')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profitLoss = totalValue !== null && totalInvested !== null ? totalValue - totalInvested : null;
  const profitLossPercent = profitLoss !== null && totalInvested && totalInvested > 0
    ? (profitLoss / totalInvested) * 100
    : 0;
  const topHoldings = getTopHoldings();
  const isPositive = (profitLoss || 0) >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {t('portfolio.myPortfolio')}
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/portfolio')}
            className="text-xs"
          >
            {t('portfolio.viewAll')}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Value */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {totalValue === null ? t('balance.rateUnavailable') : formatCurrency(totalValue, displayCurrency)}
            </p>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>
                {isPositive ? '+' : ''}{profitLossPercent.toFixed(2)}%
              </span>
              <span className="text-muted-foreground ml-1">
                ({profitLoss === null ? '—' : `${isPositive ? '+' : ''}${formatCurrency(profitLoss, displayCurrency)}`})
              </span>
            </div>
          </div>
        </div>

        {/* Top Holdings */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('portfolio.yourAssets')}
          </p>
          {topHoldings.map(item => (
            <div key={item.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.crypto_symbol}</span>
                <span className="text-xs text-muted-foreground">{item.crypto_name}</span>
              </div>
              <span className="text-sm font-medium">
                {item.currentValue === null ? '—' : formatCurrency(item.currentValue, displayCurrency)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummaryCard;
