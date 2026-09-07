import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCryptoQuotes, TOP_CRYPTO_SYMBOLS, CRYPTO_NAMES } from '@/services/marketDataApi';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

export const PublicMarket = ({ compact = false }: { compact?: boolean }) => {
  const p = usePublicContent();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['public-market-quotes'],
    queryFn: () => getCryptoQuotes(TOP_CRYPTO_SYMBOLS),
    staleTime: 600000,
    refetchInterval: 600000,
    retry: false,
  });
  const symbols = compact ? ['BTC/USD', 'ETH/USD', 'SOL/USD'] : TOP_CRYPTO_SYMBOLS;
  const rows = symbols
    .filter((symbol) =>
      `${symbol} ${CRYPTO_NAMES[symbol.split('/')[0]]}`.toLowerCase().includes(search.toLowerCase()),
    )
    .map((symbol) => {
      const quote = data?.[symbol];
      const price = Number(quote?.close);
      const change = Number(quote?.percent_change);
      return {
        symbol,
        code: symbol.split('/')[0],
        quote,
        price: Number.isFinite(price) && price > 0 ? price : null,
        change: Number.isFinite(change) ? change : null,
      };
    });
  const hasQuotes = rows.some((row) => row.price !== null);
  const lastQuoteTime = rows.find((row) => row.price !== null && row.quote?.datetime)?.quote?.datetime;
  const currency = (price: number) =>
    new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);

  return (
    <div className="public-surface">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5">
        {!compact ? (
          <label className="flex min-w-0 flex-1 items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <span className="sr-only">{p('search')}</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={p('search')}
              className="w-full bg-transparent py-1 text-sm text-white placeholder:text-neutral-500"
            />
          </label>
        ) : (
          <span className="public-eyebrow">USD · {p('market')}</span>
        )}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex shrink-0 items-center gap-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {p('refresh')}
        </button>
      </div>
      <div
        aria-busy={isFetching}
        className={compact ? 'public-grid grid sm:grid-cols-3' : 'divide-y divide-white/10'}
      >
        {rows.map((row, index) => (
          <div
            key={row.symbol}
            className={
              compact
                ? `p-5 sm:p-7 ${index > 0 ? 'border-t border-white/10 sm:border-l sm:border-t-0' : ''}`
                : 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_1fr_7rem]'
            }
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#708775]/30 bg-[#1d2a21] text-[10px] font-semibold text-[#c0d6c7]">
                {row.code}
              </span>
              <div>
                <h3 className="text-sm font-medium">{CRYPTO_NAMES[row.code] || row.code}</h3>
                <p className="text-xs text-neutral-500">{row.code} / USD</p>
              </div>
            </div>
            <p className={`${compact ? 'mt-5 text-2xl' : 'text-right text-base'} font-medium tabular-nums`}>
              {row.price === null ? '—' : currency(row.price)}
            </p>
            <p
              className={`${compact ? 'mt-2' : 'col-span-2 justify-end sm:col-span-1'} flex items-center gap-1 text-xs tabular-nums ${row.change === null ? 'text-neutral-500' : row.change >= 0 ? 'text-[#a7d9b9]' : 'text-red-300'}`}
            >
              {row.change !== null &&
                (row.change >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                ))}
              {row.change === null ? '—' : `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}%`}
              <span className="ml-1 text-neutral-500">24h</span>
            </p>
          </div>
        ))}
      </div>
      <p
        role="status"
        className="border-t border-white/10 px-5 py-3 text-xs leading-relaxed text-neutral-500"
      >
        {rows.length === 0
          ? p('emptySearch')
          : !hasQuotes
            ? isFetching
              ? t('crypto.loading')
              : p('unavailable')
            : lastQuoteTime
              ? `${p('refreshed')}: ${lastQuoteTime}`
              : p('marketIntro')}
      </p>
    </div>
  );
};
