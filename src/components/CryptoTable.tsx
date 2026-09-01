import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from "lucide-react";
import { getCryptoQuotes, TOP_CRYPTO_SYMBOLS, CRYPTO_NAMES, formatPrice, formatPercentChange } from "@/services/twelveDataApi";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface CryptoData {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  percentChange: number;
  volume: string;
  high: number;
  low: number;
  sparkline: number[];
}

const CryptoTable = () => {
  const [cryptos, setCryptos] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('top');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { t } = useLanguage();

  const filters = [
    { key: 'top', label: t('crypto.top') },
    { key: 'gainers', label: t('crypto.gainers') },
    { key: 'losers', label: t('crypto.losers') }
  ];

  useEffect(() => {
    fetchCryptoData();
    // Reduce refresh frequency to avoid API rate limits (120 seconds)
    const refreshInterval = window.setInterval(fetchCryptoData, 120000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const fetchCryptoData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (cryptos.length === 0) {
        setLoading(true);
      }
      
      const quotes = await getCryptoQuotes(TOP_CRYPTO_SYMBOLS);
      
      const cryptoArray: CryptoData[] = TOP_CRYPTO_SYMBOLS.map((symbol, index) => {
        const quote = quotes[symbol];
        const baseSymbol = symbol.split('/')[0];

        // Build a lightweight trend from the quote instead of issuing one
        // historical-data request per table row.
        const open = parseFloat(quote?.open || quote?.previous_close || '0');
        const high = parseFloat(quote?.high || '0');
        const low = parseFloat(quote?.low || '0');
        const close = parseFloat(quote?.close || '0');
        const points = [open, low, (open + close) / 2, high, close].filter(Number.isFinite);
        const max = Math.max(...points, 1);
        const min = Math.min(...points, 0);
        const sparkline = points.map((price) => ((price - min) / (max - min || 1)) * 100);

        return {
          rank: index + 1,
          symbol: baseSymbol,
          name: CRYPTO_NAMES[baseSymbol] || baseSymbol,
          price: quote?.close ? parseFloat(quote.close) : 0,
          percentChange: quote?.percent_change ? parseFloat(quote.percent_change) : 0,
          volume: quote?.volume || '0',
          high: quote?.high ? parseFloat(quote.high) : 0,
          low: quote?.low ? parseFloat(quote.low) : 0,
          sparkline
        };
      });

      setCryptos(cryptoArray);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredCryptos = () => {
    switch (activeFilter) {
      case 'gainers':
        return [...cryptos].sort((a, b) => b.percentChange - a.percentChange);
      case 'losers':
        return [...cryptos].sort((a, b) => a.percentChange - b.percentChange);
      default:
        return cryptos;
    }
  };

  const formatVolume = (vol: string) => {
    const num = parseFloat(vol);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <section className="py-8 bg-transparent">
      <div className="container mx-auto px-4">
        <div className="bg-transparent overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-4">
              {filters.map((filter) => (
                <button 
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`text-sm font-medium pb-2 ${
                    activeFilter === filter.key 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {t('crypto.updated')}: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchCryptoData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('crypto.refresh')}
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">#</TableHead>
                <TableHead className="text-muted-foreground">{t('crypto.name')}</TableHead>
                <TableHead className="text-muted-foreground">{t('crypto.price')}</TableHead>
                <TableHead className="text-muted-foreground">{t('crypto.change24h')}</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">{t('crypto.high24h')}</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">{t('crypto.low24h')}</TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">{t('crypto.volume24h')}</TableHead>
                <TableHead className="text-muted-foreground">{t('crypto.last7Days')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && cryptos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">{t('crypto.loadingCryptoData')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                getFilteredCryptos().map((crypto) => (
                  <TableRow key={crypto.symbol} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium">{crypto.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">
                          {crypto.symbol.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{crypto.name}</div>
                          <div className="text-xs text-muted-foreground">{crypto.symbol}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatPrice(crypto.price)}</TableCell>
                    <TableCell className={crypto.percentChange >= 0 ? 'text-success' : 'text-destructive'}>
                      <div className="flex items-center gap-1">
                        {crypto.percentChange >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercentChange(crypto.percentChange)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatPrice(crypto.high)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatPrice(crypto.low)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatVolume(crypto.volume)}
                    </TableCell>
                    <TableCell>
                      <div className="h-12 w-24 flex items-end gap-0.5">
                        {crypto.sparkline.map((height, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm ${crypto.percentChange >= 0 ? 'bg-success' : 'bg-destructive'}`}
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
};

export default CryptoTable;
