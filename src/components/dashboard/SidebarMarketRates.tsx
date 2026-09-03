import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getCryptoQuotes,
  TOP_CRYPTO_SYMBOLS,
  type CryptoQuote,
} from '@/services/marketDataApi';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const CRYPTO_SYMBOLS = [
  ...TOP_CRYPTO_SYMBOLS,
  'XLM/USD',
  'DOT/USD',
  'UNI/USD',
  'AAVE/USD',
  'SHIB/USD',
  'HBAR/USD',
];

interface MarketSnapshot {
  crypto: Record<string, CryptoQuote>;
  updatedAt: number;
}

const formatCryptoPrice = (value: number) => {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 0.01) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 })}`;
};

const SidebarMarketRates = ({ className }: { className?: string }) => {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRates = useCallback(async () => {
    setLoading(true);
    // The header ticker asks for this same batch, allowing the shared cache and
    // in-flight request deduplication to prevent duplicate provider traffic.
    const crypto = await getCryptoQuotes(CRYPTO_SYMBOLS);

    if (Object.keys(crypto).length > 0) {
      setSnapshot({ crypto, updatedAt: Date.now() });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRates();
    const refreshTimer = window.setInterval(() => void loadRates(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [loadRates]);

  return (
    <section className={cn('mt-4 flex flex-1 flex-col border-t border-white/5 pt-4', className)} aria-label="Market rates">
      <div className="mb-2 flex items-center justify-between px-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70">MARKET RATES</p>
          <p className="mt-0.5 text-[9px] text-muted-foreground/55">Coinbase · 10 min refresh</p>
        </div>
        <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground/60', loading && 'animate-spin')} />
      </div>

      {!snapshot && loading ? (
        <div
          className="grid flex-1 gap-1.5 px-4 py-2"
          style={{ gridTemplateRows: `repeat(${CRYPTO_SYMBOLS.length}, minmax(42px, 64px))` }}
        >
          {CRYPTO_SYMBOLS.map((symbol) => <div key={symbol} className="min-h-10 animate-pulse rounded bg-white/[0.04]" />)}
        </div>
      ) : !snapshot ? (
        <p className="px-4 py-2 text-[11px] text-muted-foreground">Rates temporarily unavailable</p>
      ) : (
        <div className="flex flex-1 flex-col pb-3">
          <p className="px-4 pb-2 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">Crypto / USD</p>
          <div
            className="grid flex-1 content-start gap-1.5"
            style={{ gridTemplateRows: `repeat(${CRYPTO_SYMBOLS.length}, minmax(42px, 64px))` }}
          >
            {CRYPTO_SYMBOLS.map((symbol) => {
              const quote = snapshot.crypto[symbol];
              if (!quote) return null;
              const price = Number(quote.close);
              const change = Number(quote.percent_change);
              const positive = change >= 0;
              return (
                <div key={symbol} className="flex min-h-[42px] items-center gap-2 rounded-lg px-4 py-2.5 text-[11px] transition-colors hover:bg-white/[0.035]">
                  <span className="w-8 font-medium text-foreground">{symbol.split('/')[0]}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{formatCryptoPrice(price)}</span>
                  <span className={cn('flex w-12 items-center justify-end gap-0.5 tabular-nums', positive ? 'text-emerald-400' : 'text-rose-400')}>
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(change).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 border-t border-white/5 px-4 pt-3 text-[9px] text-muted-foreground/50">
            Updated {new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </section>
  );
};

export default SidebarMarketRates;
