import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { getCryptoQuotes, formatPrice, formatPercentChange } from "@/services/twelveDataApi";
import { useLanguage } from "@/contexts/LanguageContext";

interface CoinData {
  name: string;
  symbol: string;
  price: number;
  change: number;
}

const CryptoStats = () => {
  const [trendingCoins, setTrendingCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketCap, setMarketCap] = useState({ value: '€3.2T', change: 0 });
  const [volume24h, setVolume24h] = useState({ value: '€180B', change: 0 });
  const [fearGreedIndex] = useState(72);
  const { t } = useLanguage();

  useEffect(() => {
    fetchTrendingData();
    // Reduce refresh frequency to avoid API rate limits (180 seconds)
    const interval = setInterval(fetchTrendingData, 180000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrendingData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in a single API call to reduce API usage
      const allSymbols = ['BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'USDT/USD'];
      const quotes = await getCryptoQuotes(allSymbols);
      
      const names: Record<string, string> = {
        'ETH/USD': 'Ethereum', 
        'XRP/USD': 'XRP',
        'SOL/USD': 'Solana',
        'USDT/USD': 'Tether'
      };

      const trendingSymbols = ['ETH/USD', 'XRP/USD', 'SOL/USD'];
      const coins: CoinData[] = trendingSymbols.slice(0, 3).map(symbol => {
        const quote = quotes[symbol];
        return {
          name: names[symbol] || symbol,
          symbol: symbol.split('/')[0],
          price: quote?.close ? parseFloat(quote.close) : 0,
          change: quote?.percent_change ? parseFloat(quote.percent_change) : 0
        };
      });

      setTrendingCoins(coins);

      // Calculate approximate market cap change based on BTC from same request
      if (quotes['BTC/USD']) {
        const btcChange = parseFloat(quotes['BTC/USD'].percent_change || '0');
        setMarketCap({ value: '€3.2T', change: btcChange * 0.7 });
        setVolume24h({ value: '€180B', change: btcChange * 0.5 });
      }

    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFearGreedLabel = (value: number) => {
    if (value > 70) return t('crypto.extremeGreed');
    if (value > 50) return t('crypto.greed');
    return t('crypto.neutral');
  };

  const stats = [
    {
      title: t('crypto.trendingCoins'),
      items: trendingCoins.map(coin => ({
        name: coin.symbol,
        price: formatPrice(coin.price),
        change: formatPercentChange(coin.change),
        positive: coin.change >= 0
      })),
    },
    {
      title: t('crypto.recentlyAdded'),
      items: [
        { name: "VIRTUAL", price: "€2.45", change: "+12.5%", positive: true },
        { name: "PEPE", price: "€0.00001234", change: "+8.2%", positive: true },
        { name: "WIF", price: "€2.89", change: "-3.4%", positive: false },
      ],
    },
    {
      title: t('crypto.mostVisited'),
      items: trendingCoins.slice(0, 3).map(coin => ({
        name: coin.symbol,
        price: formatPrice(coin.price),
        change: formatPercentChange(coin.change),
        positive: coin.change >= 0
      })),
    },
  ];

  const highlights = [
    { label: t('crypto.marketCap'), value: marketCap.value, change: formatPercentChange(marketCap.change), positive: marketCap.change >= 0 },
    { label: t('crypto.volume24hLabel'), value: volume24h.value, change: formatPercentChange(volume24h.change), positive: volume24h.change >= 0 },
    { label: t('crypto.fearGreed'), value: String(fearGreedIndex), subtext: getFearGreedLabel(fearGreedIndex), gaugeValue: fearGreedIndex },
  ];

  return (
    <section className="py-10 bg-transparent">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="text-primary">{t('crypto.cryptoScamBuster')}</span>
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          {t('crypto.protectYourself')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{stat.title}</h3>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <div className="space-y-3">
                {stat.items.length > 0 ? stat.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.price}</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${item.positive ? 'text-success' : 'text-destructive'}`}>
                      {item.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {item.change}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">{t('crypto.loading')}</div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((highlight, index) => (
            <Card key={index} className="bg-card border-border p-6">
              <h3 className="text-sm text-muted-foreground mb-2">{highlight.label}</h3>
              <div className="text-2xl font-bold mb-1">{highlight.value}</div>
              {highlight.change && (
                <div className={`text-sm ${highlight.positive ? 'text-success' : 'text-destructive'}`}>
                  {highlight.change}
                </div>
              )}
              {highlight.subtext && (
                <div className="text-sm text-muted-foreground mt-1">{highlight.subtext}</div>
              )}
              {highlight.gaugeValue && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(highlight.gaugeValue / 100) * 352} 352`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                      {highlight.gaugeValue}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CryptoStats;
