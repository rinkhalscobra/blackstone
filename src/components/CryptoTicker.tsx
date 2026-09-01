import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getCryptoQuotes, formatPrice, formatPercentChange, TOP_CRYPTO_SYMBOLS, CRYPTO_NAMES } from "@/services/marketDataApi";
import { cn } from "@/lib/utils";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

interface CryptoTickerProps {
  className?: string;
}

const CryptoTicker = ({ className }: CryptoTickerProps) => {
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetchTickerData();
    // Reduce refresh frequency to avoid API rate limits (120 seconds)
    const refreshInterval = window.setInterval(fetchTickerData, 120000);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const fetchTickerData = async () => {
    try {
      const quotes = await getCryptoQuotes(TOP_CRYPTO_SYMBOLS.slice(0, 10));
      
      const items: TickerItem[] = TOP_CRYPTO_SYMBOLS.slice(0, 10).map(symbol => {
        const quote = quotes[symbol];
        const baseSymbol = symbol.split('/')[0];
        return {
          symbol: baseSymbol,
          name: CRYPTO_NAMES[baseSymbol] || baseSymbol,
          price: quote?.close ? parseFloat(quote.close) : 0,
          change: quote?.percent_change ? parseFloat(quote.percent_change) : 0
        };
      });
      
      setTickerData(items);
    } catch (error) {
      console.error('Error fetching ticker data:', error);
    }
  };

  if (tickerData.length === 0) return null;

  return (
    <div className={cn("bg-transparent overflow-hidden", className)}>
      <div className="flex animate-scroll py-3">
        <div className="flex shrink-0 gap-10 px-4">
          {[...tickerData, ...tickerData].map((item, index) => (
            <div key={index} className="flex items-center gap-3 text-sm whitespace-nowrap">
              <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">
                {item.symbol.charAt(0)}
              </div>
              <div>
                <span className="font-medium">{item.symbol}</span>
                <span className="text-muted-foreground ml-1 text-xs">{item.name}</span>
              </div>
              <span className="font-semibold">{formatPrice(item.price)}</span>
              <span className={`flex items-center gap-0.5 ${item.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {item.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercentChange(item.change)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CryptoTicker;
