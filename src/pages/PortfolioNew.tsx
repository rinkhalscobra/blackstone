import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Wallet, DollarSign, PieChart as PieChartIcon, Coins } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useAccountValuation } from "@/hooks/useAccountValuation";

const CHART_COLORS = [
  "#fafafa",
  "#e5e5e5",
  "#d4d4d4",
  "#bdbdbd",
  "#a3a3a3",
  "#8a8a8a",
  "#737373",
  "#666666",
  "#525252",
  "#404040",
];

interface AllocationDatum {
  name: string;
  fullName: string;
  value: number;
  percentage: number;
  color: string;
}

interface TooltipEntry {
  payload: AllocationDatum;
}

interface LegendEntry {
  color?: string;
  value?: string | number;
  payload?: AllocationDatum;
}

const PortfolioNew = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  useEffect(() => {
    if (!user) return;
    void supabase
      .from('profiles')
      .select('preferred_currency, display_currency')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setDisplayCurrency((data?.preferred_currency || data?.display_currency || 'USD').toUpperCase());
      });
  }, [user]);

  const account = useAccountValuation({
    userId: user?.id,
    cashBalance: 0,
    cashCurrency: displayCurrency,
    displayCurrency,
  });
  const portfolioItems = account.holdings;
  const loading = authLoading || account.isLoading;

  const calculateTotals = () => {
    const totalValue = account.portfolioValue || 0;
    const totalInvested = account.totalInvested || 0;

    const profitLoss = totalValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return { totalValue, totalInvested, profitLoss, profitLossPercentage };
  };

  const getPieChartData = () => {
    const { totalValue } = calculateTotals();
    
    return portfolioItems.map((item, index) => {
      const value = item.currentValue || 0;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      
      return {
        name: item.crypto_symbol.toUpperCase(),
        fullName: item.crypto_name,
        value: value,
        percentage: percentage,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  };

  const { totalValue, totalInvested, profitLoss, profitLossPercentage } = calculateTotals();
  const pieChartData = getPieChartData();

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">{data.name}</p>
          <p className="text-sm font-medium text-foreground">{formatCurrency(data.value, displayCurrency)}</p>
          <p className="text-sm text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: { payload?: LegendEntry[] }) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload?.map((entry, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.value} ({entry.payload?.percentage.toFixed(1) || '0.0'}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navigation />
        <main className="pt-8 pb-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-6">{t('crypto.portfolioTracker')}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t('crypto.pleaseLoginPortfolio')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navigation />
        <main className="pt-8 pb-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-lg">{t('crypto.loadingPortfolio')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">{t('crypto.myPortfolio')}</h1>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Value Card */}
            <Card className="bg-secondary/50 border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t('crypto.totalPortfolioValue')}</p>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold">{formatCurrency(totalValue, displayCurrency)}</h2>
            </Card>

            {/* Total Invested Card */}
            <Card className="bg-secondary/50 border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t('crypto.totalInvested')}</p>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold">{formatCurrency(totalInvested, displayCurrency)}</h2>
            </Card>

            {/* Profit/Loss Card */}
            <Card className="bg-secondary/50 border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${profitLoss >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {profitLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t('crypto.profitLoss')}</p>
              </div>
              <h2 className={`text-2xl lg:text-3xl font-bold ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss, displayCurrency)}
              </h2>
              <p className={`text-sm ${profitLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                ({profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
              </p>
            </Card>

            {/* Number of Assets Card */}
            <Card className="bg-secondary/50 border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Coins className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t('crypto.numberOfAssets')}</p>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold">{portfolioItems.length}</h2>
            </Card>
          </div>

          {portfolioItems.length === 0 ? (
            <Card className="bg-secondary/50 border-border p-12 text-center">
              <p className="text-lg text-muted-foreground">
                {t('crypto.portfolioEmpty')}
              </p>
            </Card>
          ) : (
            <>
              {/* Portfolio Allocation Pie Chart */}
              <Card className="bg-secondary/50 border-border p-6 mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{t('crypto.portfolioAllocation')}</h3>
                </div>
                
                <div className="h-[300px] lg:h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend content={<CustomLegend />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center label for total value */}
                <div className="text-center -mt-[190px] lg:-mt-[210px] mb-[120px] lg:mb-[140px] pointer-events-none">
                  <p className="text-sm text-muted-foreground">{t('crypto.totalPortfolioValue')}</p>
                  <p className="text-xl font-bold">{formatCurrency(totalValue, displayCurrency)}</p>
                </div>
              </Card>

              {/* Portfolio Items List */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">{t('crypto.yourAssets')}</h3>
                {portfolioItems.map((item, index) => {
                  const currentValue = item.currentValue || 0;
                  const invested = item.investedValue || 0;
                  const itemProfit = currentValue - invested;
                  const itemProfitPercentage = invested > 0 ? (itemProfit / invested) * 100 : 0;
                  const allocationPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
                  const color = CHART_COLORS[index % CHART_COLORS.length];

                  return (
                    <Card key={item.id} className="bg-secondary/50 border-border p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Color indicator matching pie chart */}
                          <div 
                            className="w-3 h-12 rounded-full hidden lg:block"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold">{item.crypto_name}</h3>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${color}20`, color: color }}
                              >
                                {allocationPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-muted-foreground">{item.crypto_symbol.toUpperCase()}</p>
                            {item.wallet_address && (
                              <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                                {t('portfolio.wallet')}: {item.wallet_address}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:flex lg:items-center gap-4 lg:gap-8">
                          <div className="text-left lg:text-right">
                            <p className="text-sm text-muted-foreground">{t('crypto.quantity')}</p>
                            <p className="font-medium">{item.quantity.toFixed(8)}</p>
                          </div>

                          <div className="text-left lg:text-right">
                            <p className="text-sm text-muted-foreground">{t('crypto.currentPrice')}</p>
                            <p className="font-medium">{formatCurrency(item.currentPrice || 0, displayCurrency)}</p>
                          </div>

                          <div className="text-left lg:text-right">
                            <p className="text-sm text-muted-foreground">{t('crypto.value')}</p>
                            <p className="font-medium">{formatCurrency(currentValue, displayCurrency)}</p>
                          </div>

                          <div className="text-left lg:text-right">
                            <p className="text-sm text-muted-foreground">{t('crypto.profitLoss')}</p>
                            <p className={`font-medium ${itemProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {itemProfit >= 0 ? '+' : ''}{formatCurrency(itemProfit, displayCurrency)} ({itemProfitPercentage >= 0 ? '+' : ''}{itemProfitPercentage.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PortfolioNew;
