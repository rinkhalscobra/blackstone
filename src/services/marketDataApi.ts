import { supabase } from "@/integrations/supabase/client";

export interface CryptoQuote {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  is_market_open: boolean;
}

export interface TimeSeriesData {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency_base: string;
    currency_quote: string;
    type: string;
  };
  values: TimeSeriesData[];
  status: string;
}

export interface CryptoExchange {
  name: string;
  code: string;
}

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();
const CACHE_TTL = 10 * 60 * 1000; // Keep market data stable and conserve provider credits

// Pending requests to prevent duplicate calls
const pendingRequests: Map<string, Promise<any>> = new Map();

// Concurrency limiter to avoid overwhelming the edge runtime (503 degraded)
const MAX_CONCURRENT = 3;
let activeRequests = 0;
const queue: Array<() => void> = [];

const acquireSlot = (): Promise<void> =>
  new Promise((resolve) => {
    const tryAcquire = () => {
      if (activeRequests < MAX_CONCURRENT) {
        activeRequests++;
        resolve();
      } else {
        queue.push(tryAcquire);
      }
    };
    tryAcquire();
  });

const releaseSlot = () => {
  activeRequests--;
  const next = queue.shift();
  if (next) next();
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getCacheKey = (endpoint: string, params?: Record<string, string>) => {
  return `${endpoint}:${JSON.stringify(params || {})}`;
};

const getFromCache = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
};

const setCache = <T>(key: string, data: T) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Helper to call our edge function with caching, deduplication, concurrency limiting and retry
const callCryptoApi = async (endpoint: string, params?: Record<string, string>) => {
  const cacheKey = getCacheKey(endpoint, params);

  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    try {
      await acquireSlot();
      try {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke('crypto-data', {
              body: { endpoint, params },
            });

            if (error) throw error;

            // The edge function deliberately returns an empty successful payload
            // when Coinbase is rate limited so the UI can keep rendering.
            if (data?.status === 'rate_limited') return data;
            if (data?.error) throw new Error(data.error);

            setCache(cacheKey, data);
            return data;
          } catch (err) {
            lastError = err;
            const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            const isTransient = message.includes('503') || message.includes('degraded') || message.includes('non-2xx');
            if (!isTransient || attempt === 2) throw err;
            await sleep(500 * Math.pow(2, attempt));
          }
        }
        throw lastError;
      } finally {
        releaseSlot();
      }
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, request);
  return request;
};


// Cache and deduplicate individual symbols, since widgets request overlapping batches.
interface PendingQuote {
  promise: Promise<CryptoQuote | undefined>;
  resolve: (quote: CryptoQuote | undefined) => void;
}
const quoteCache = new Map<string, CacheEntry<CryptoQuote>>();
const pendingQuotes = new Map<string, PendingQuote>();
const queuedQuotes = new Map<string, PendingQuote>();
let quoteBatchScheduled = false;
const MAX_QUOTE_BATCH = 16; // Matches the edge function's symbol limit.

const flushQuoteBatch = () => {
  quoteBatchScheduled = false;
  const entries = [...queuedQuotes.entries()].sort(([a], [b]) => a.localeCompare(b));
  queuedQuotes.clear();
  for (let offset = 0; offset < entries.length; offset += MAX_QUOTE_BATCH) {
    const batch = entries.slice(offset, offset + MAX_QUOTE_BATCH);
    void (async () => {
      const quotes = new Map<string, CryptoQuote>();
      try {
        const data = await callCryptoApi('quote', { symbol: batch.map(([symbol]) => symbol).join(',') });
        const values: unknown[] = data?.symbol ? [data] : Object.values(data || {});
        for (const value of values) {
          if (!value || typeof value !== 'object') continue;
          const quote = value as CryptoQuote;
          if (typeof quote.symbol !== 'string' || !Number.isFinite(Number(quote.close)) || Number(quote.close) <= 0) continue;
          quotes.set(quote.symbol, quote);
        }
      } catch (error) {
        console.error('Error fetching crypto quotes:', error);
      } finally {
        for (const [symbol, pending] of batch) {
          const quote = quotes.get(symbol);
          if (quote) quoteCache.set(symbol, { data: quote, timestamp: Date.now() });
          pendingQuotes.delete(symbol);
          pending.resolve(quote);
        }
      }
    })();
  }
};

const requestQuote = (symbol: string): Promise<CryptoQuote | undefined> => {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return Promise.resolve(cached.data);
  quoteCache.delete(symbol);
  const existing = pendingQuotes.get(symbol);
  if (existing) return existing.promise;

  let resolve: PendingQuote['resolve'];
  const promise = new Promise<CryptoQuote | undefined>(complete => { resolve = complete; });
  const pending = { promise, resolve };
  pendingQuotes.set(symbol, pending);
  queuedQuotes.set(symbol, pending);
  if (!quoteBatchScheduled) {
    quoteBatchScheduled = true;
    queueMicrotask(flushQuoteBatch);
  }
  return promise;
};

export const getCryptoQuotes = async (symbols: string[]): Promise<Record<string, CryptoQuote>> => {
  const normalized = [...new Set(symbols.map(symbol => symbol.trim().toUpperCase().replace('-', '/')).filter(Boolean))];
  const quotes = await Promise.all(normalized.map(async symbol => [symbol, await requestQuote(symbol)] as const));
  return Object.fromEntries(quotes.filter(([, quote]) => quote !== undefined));
};

// Get single crypto price
export const getCryptoPrice = async (symbol: string): Promise<string | null> => {
  try {
    const data = await callCryptoApi('price', { symbol });
    return data?.price || null;
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return null;
  }
};

// Get time series data for charts
export const getTimeSeries = async (
  symbol: string, 
  interval: string = '1day', 
  outputsize: string = '30'
): Promise<TimeSeriesData[]> => {
  try {
    const data = await callCryptoApi('time_series', { 
      symbol, 
      interval,
      outputsize 
    });
    return data?.values || [];
  } catch (error) {
    console.error('Error fetching time series:', error);
    return [];
  }
};

// Get exchange rate between two currencies
export const getExchangeRate = async (fromSymbol: string, toSymbol: string = 'USD'): Promise<number | null> => {
  try {
    const data = await callCryptoApi('exchange_rate', { 
      symbol: `${fromSymbol}/${toSymbol}` 
    });
    return data?.rate ? parseFloat(data.rate) : null;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return null;
  }
};

// Fetch several fiat rates from a single provider response.
export const getExchangeRates = async (base: string, quotes: string[]): Promise<Record<string, number>> => {
  try {
    const normalizedQuotes = [...new Set(quotes.map((quote) => quote.trim().toUpperCase()).filter(Boolean))].sort();
    const data = await callCryptoApi('exchange_rates', {
      base: base.trim().toUpperCase(),
      quotes: normalizedQuotes.join(','),
    });
    if (!data?.rates || typeof data.rates !== 'object') return {};
    return Object.fromEntries(
      Object.entries(data.rates)
        .map(([symbol, rate]): [string, number] => [symbol, Number(rate)])
        .filter(([, rate]) => Number.isFinite(rate) && rate > 0),
    );
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return {};
  }
};

// Get list of cryptocurrency exchanges
export const getCryptoExchanges = async (): Promise<CryptoExchange[]> => {
  try {
    const data = await callCryptoApi('crypto_exchanges');
    return data?.data || [];
  } catch (error) {
    console.error('Error fetching crypto exchanges:', error);
    return [];
  }
};

// Get list of available cryptocurrencies  
export const getAvailableCryptos = async (): Promise<any[]> => {
  try {
    const data = await callCryptoApi('cryptocurrencies');
    return data?.data || [];
  } catch (error) {
    console.error('Error fetching available cryptos:', error);
    return [];
  }
};

// Top crypto symbols for the main table (verified working with Coinbase)
export const TOP_CRYPTO_SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'SOL/USD',
  'ADA/USD',
  'DOGE/USD',
  'AVAX/USD',
  'LTC/USD',
  'BCH/USD',
  'LINK/USD',
];

// Crypto name mapping
export const CRYPTO_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'XRP': 'XRP',
  'USDT': 'Tether',
  'BNB': 'BNB',
  'SOL': 'Solana',
  'DOGE': 'Dogecoin',
  'ADA': 'Cardano',
  'TRX': 'TRON',
  'AVAX': 'Avalanche',
  'LTC': 'Litecoin',
  'BCH': 'Bitcoin Cash',
  'LINK': 'Chainlink',
  'XLM': 'Stellar',
  'ETC': 'Ethereum Classic'
};

// Format large numbers
export const formatMarketCap = (value: number): string => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(2)}`;
};

// Format price based on value
export const formatPrice = (price: number): string => {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
};

// Format percentage change
export const formatPercentChange = (change: string | number): string => {
  const num = typeof change === 'string' ? parseFloat(change) : change;
  const prefix = num >= 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
};
