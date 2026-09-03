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
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { data, error } = await supabase.functions.invoke('crypto-data', {
              body: { endpoint, params },
            });

            if (error) {
              const msg = String(error?.message || error);
              // Retry on transient degraded / 503 responses
              if (msg.includes('503') || msg.includes('DEGRADED') || msg.includes('non-2xx')) {
                lastError = error;
                await sleep(500 * Math.pow(2, attempt));
                continue;
              }
              throw error;
            }

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


// Get real-time quotes for cryptocurrencies
export const getCryptoQuotes = async (symbols: string[]): Promise<Record<string, CryptoQuote>> => {
  try {
    // Sort symbols to ensure consistent cache key
    const sortedSymbols = [...symbols].sort();
    const symbolString = sortedSymbols.join(',');
    const data = await callCryptoApi('quote', { symbol: symbolString });
    
    // If single symbol, wrap in object
    if (!Array.isArray(data) && data.symbol) {
      return { [data.symbol]: data };
    }
    
    // Multiple symbols return as object with symbol keys
    return data;
  } catch (error) {
    console.error('Error fetching crypto quotes:', error);
    return {};
  }
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
        .map(([symbol, rate]) => [symbol, Number(rate)])
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
