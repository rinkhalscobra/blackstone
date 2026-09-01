import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { getCryptoPrices, CryptoPrice } from '@/services/cryptoApi';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatEuro } from '@/lib/utils';

interface PortfolioItem {
  id: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  quantity: number;
  purchase_price: number;
}

const PortfolioSummaryCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        
        const portfolioItems = data || [];
        setItems(portfolioItems);

        if (portfolioItems.length > 0) {
          const cryptoIds = [...new Set(portfolioItems.map(item => item.crypto_id))];
          const priceData = await getCryptoPrices(cryptoIds);
          setPrices(priceData);
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, [user]);

  const calculateTotals = () => {
    let totalValue = 0;
    let totalInvested = 0;

    items.forEach(item => {
      const priceKey = Object.keys(prices).find(k => 
        k.toLowerCase().includes(item.crypto_id.toLowerCase().replace('/usd', ''))
      );
      const currentPrice = priceKey ? prices[priceKey]?.current_price : item.purchase_price;
      totalValue += item.quantity * (currentPrice || item.purchase_price);
      totalInvested += item.quantity * item.purchase_price;
    });

    const profitLoss = totalValue - totalInvested;
    const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, profitLoss, profitLossPercent };
  };

  const getTopHoldings = () => {
    return items
      .map(item => {
        const priceKey = Object.keys(prices).find(k => 
          k.toLowerCase().includes(item.crypto_id.toLowerCase().replace('/usd', ''))
        );
        const currentPrice = priceKey ? prices[priceKey]?.current_price : item.purchase_price;
        return {
          ...item,
          currentValue: item.quantity * (currentPrice || item.purchase_price)
        };
      })
      .sort((a, b) => b.currentValue - a.currentValue)
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

  const { totalValue, profitLoss, profitLossPercent } = calculateTotals();
  const topHoldings = getTopHoldings();
  const isPositive = profitLoss >= 0;

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
              {formatEuro(totalValue)}
            </p>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>
                {isPositive ? '+' : ''}{profitLossPercent.toFixed(2)}%
              </span>
              <span className="text-muted-foreground ml-1">
                ({isPositive ? '+' : ''}{formatEuro(profitLoss)})
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
                {formatEuro(item.currentValue)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummaryCard;
