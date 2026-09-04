import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXCHANGE_URL = "https://api.exchange.coinbase.com";
const DATA_URL = "https://api.coinbase.com/v2";
const CACHE_TTL_MS = 2 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const MAX_SYMBOLS = 16;
const MAX_RATE_SYMBOLS = 30;

const cryptoNames: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  XRP: "XRP",
  USDT: "Tether",
  SOL: "Solana",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  LTC: "Litecoin",
  BCH: "Bitcoin Cash",
  LINK: "Chainlink",
  XLM: "Stellar",
  DOT: "Polkadot",
  UNI: "Uniswap",
  AAVE: "Aave",
  SHIB: "Shiba Inu",
  HBAR: "Hedera",
};

const allowedProducts = new Map(
  Object.keys(cryptoNames).map((symbol) => [`${symbol}/USD`, `${symbol}-USD`]),
);

const responseCache = new Map<string, { data: unknown; timestamp: number }>();

const RequestSchema = z.object({
  endpoint: z.enum([
    "cryptocurrencies",
    "quote",
    "price",
    "time_series",
    "exchange_rate",
    "exchange_rates",
    "crypto_exchanges",
    "eod",
  ]),
  params: z.record(z.string()).optional().default({}),
});

const fetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "BrightFund/1.0",
    },
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 300);
    throw new Error(`Coinbase request failed (${response.status}): ${message}`);
  }

  return await response.json();
};

const normalizeProduct = (rawSymbol: string) => {
  const display = rawSymbol.trim().toUpperCase().replace("-", "/");
  const product = allowedProducts.get(display);
  if (!product) return null;

  const [base, quote] = display.split("/");
  return { display, product, base, quote };
};

const parseCurrencies = (rawSymbol: string) => {
  const parts = rawSymbol.trim().toUpperCase().replace("-", "/").split("/");
  if (parts.length !== 2 || parts.some((part) => !/^[A-Z0-9]{2,10}$/.test(part))) {
    return null;
  }
  return { base: parts[0], quote: parts[1] };
};

const granularityForInterval = (interval = "1day") => {
  const granularities: Record<string, number> = {
    "1min": 60,
    "5min": 300,
    "15min": 900,
    "30min": 900,
    "45min": 900,
    "1h": 3600,
    "2h": 3600,
    "4h": 21600,
    "1day": 86400,
    "1week": 86400,
    "1month": 86400,
  };
  return granularities[interval] ?? 86400;
};

const getQuote = async (rawSymbol: string) => {
  const normalized = normalizeProduct(rawSymbol);
  if (!normalized) return null;

  const stats = await fetchJson(`${EXCHANGE_URL}/products/${normalized.product}/stats`);
  const open = Number(stats.open || 0);
  const close = Number(stats.last || 0);
  const change = close - open;
  const percentChange = open > 0 ? (change / open) * 100 : 0;
  const now = new Date();

  return {
    symbol: normalized.display,
    name: cryptoNames[normalized.base] ?? normalized.base,
    exchange: "Coinbase Exchange",
    datetime: now.toISOString(),
    timestamp: Math.floor(now.getTime() / 1000),
    open: String(stats.open ?? 0),
    high: String(stats.high ?? 0),
    low: String(stats.low ?? 0),
    close: String(stats.last ?? 0),
    volume: String(stats.volume ?? 0),
    previous_close: String(stats.open ?? 0),
    change: String(change),
    percent_change: String(percentChange),
    is_market_open: true,
  };
};

const handleRequest = async (endpoint: string, params: Record<string, string>) => {
  switch (endpoint) {
    case "quote": {
      const symbols = [...new Set((params.symbol ?? "").split(",").map((value) => value.trim()).filter(Boolean))]
        .slice(0, MAX_SYMBOLS);
      const quotes = (await Promise.all(symbols.map(async (symbol) => {
        try {
          return await getQuote(symbol);
        } catch (error) {
          console.warn(`Quote unavailable for ${symbol}:`, error);
          return null;
        }
      }))).filter((quote): quote is NonNullable<typeof quote> => quote !== null);

      if (quotes.length === 0) throw new Error("No supported Coinbase quote symbols were supplied");
      if (quotes.length === 1) return quotes[0];
      return Object.fromEntries(quotes.map((quote) => [quote.symbol, quote]));
    }

    case "price": {
      const symbol = normalizeProduct(params.symbol ?? "");
      if (!symbol) throw new Error("Unsupported price symbol");
      const data = await fetchJson(`${DATA_URL}/prices/${symbol.product}/spot`);
      return { price: data.data.amount };
    }

    case "time_series": {
      const symbol = normalizeProduct(params.symbol ?? "");
      if (!symbol) throw new Error("Unsupported time-series symbol");
      const granularity = granularityForInterval(params.interval);
      const outputSize = Math.min(300, Math.max(1, Number.parseInt(params.outputsize ?? "30", 10) || 30));
      const candles = await fetchJson(
        `${EXCHANGE_URL}/products/${symbol.product}/candles?granularity=${granularity}`,
      );
      const values = (candles as Array<[number, number, number, number, number, number]>)
        .slice(0, outputSize)
        .map(([time, low, high, open, close, volume]) => ({
          datetime: new Date(time * 1000).toISOString(),
          open: String(open),
          high: String(high),
          low: String(low),
          close: String(close),
          volume: String(volume),
        }));
      return {
        meta: {
          symbol: symbol.display,
          interval: params.interval ?? "1day",
          currency_base: symbol.base,
          currency_quote: symbol.quote,
          type: "Digital Currency",
        },
        values,
        status: "ok",
      };
    }

    case "exchange_rate": {
      const currencies = parseCurrencies(params.symbol ?? "");
      if (!currencies) throw new Error("Invalid exchange-rate pair");
      const data = await fetchJson(
        `${DATA_URL}/exchange-rates?currency=${encodeURIComponent(currencies.base)}`,
      );
      const rate = data.data?.rates?.[currencies.quote];
      if (!rate) throw new Error(`No exchange rate for ${currencies.base}/${currencies.quote}`);
      return { symbol: `${currencies.base}/${currencies.quote}`, rate };
    }

    case "exchange_rates": {
      const base = (params.base ?? "USD").trim().toUpperCase();
      const quotes = [...new Set((params.quotes ?? "")
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean))]
        .slice(0, MAX_RATE_SYMBOLS);
      if (!/^[A-Z0-9]{2,10}$/.test(base) || quotes.length === 0 || quotes.some((quote) => !/^[A-Z0-9]{2,10}$/.test(quote))) {
        throw new Error("Invalid exchange-rate currencies");
      }

      const data = await fetchJson(`${DATA_URL}/exchange-rates?currency=${encodeURIComponent(base)}`);
      const providerRates = data.data?.rates ?? {};
      return {
        base,
        rates: Object.fromEntries(
          quotes
            .filter((quote) => providerRates[quote])
            .map((quote) => [quote, Number(providerRates[quote])]),
        ),
      };
    }

    case "cryptocurrencies": {
      const currencies = await fetchJson(`${EXCHANGE_URL}/currencies`);
      return {
        data: (currencies as Array<Record<string, unknown>>)
          .filter((currency) => currency.status === "online" && currency.details &&
            (currency.details as Record<string, unknown>).type === "crypto")
          .map((currency) => ({
            symbol: currency.id,
            name: currency.name,
            currency_base: currency.id,
            currency_quote: "USD",
          })),
      };
    }

    case "crypto_exchanges":
      return { data: [{ name: "Coinbase Pro", code: "COINBASE" }] };

    case "eod": {
      const symbol = normalizeProduct(params.symbol ?? "");
      if (!symbol) throw new Error("Unsupported end-of-day symbol");
      const candles = await fetchJson(`${EXCHANGE_URL}/products/${symbol.product}/candles?granularity=86400`);
      const [time, low, high, open, close, volume] = candles[0] as [number, number, number, number, number, number];
      return {
        symbol: symbol.display,
        datetime: new Date(time * 1000).toISOString(),
        open: String(open),
        high: String(high),
        low: String(low),
        close: String(close),
        volume: String(volume),
      };
    }

    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = `${parsed.data.endpoint}:${JSON.stringify(parsed.data.params)}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    try {
      const data = await handleRequest(parsed.data.endpoint, parsed.data.params);
      responseCache.set(cacheKey, { data, timestamp: Date.now() });
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Data-Provider": "Coinbase" },
      });
    } catch (error) {
      if (cached && Date.now() - cached.timestamp < STALE_TTL_MS) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "STALE" },
        });
      }
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("crypto-data error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
