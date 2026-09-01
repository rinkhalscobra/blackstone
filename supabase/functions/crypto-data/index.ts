import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const TWELVEDATA_API_KEY = Deno.env.get('TWELVEDATA_API_KEY');
const BASE_URL = 'https://api.twelvedata.com';
const ALLOWED_SYMBOLS = new Set(['BTC/USD', 'ETH/USD', 'USDT/USD', 'SOL/USD', 'XRP/USD']);
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const RequestSchema = z.object({
  endpoint: z.enum(['cryptocurrencies', 'quote', 'price', 'time_series', 'exchange_rate', 'crypto_exchanges', 'eod']),
  params: z.record(z.string()).optional().default({}),
});

const emptyPayload = (endpoint: string) => {
  if (endpoint === 'time_series') return { status: 'rate_limited', values: [] };
  if (endpoint === 'price') return { status: 'rate_limited', price: null };
  if (endpoint === 'cryptocurrencies' || endpoint === 'crypto_exchanges') {
    return { status: 'rate_limited', data: [] };
  }
  return { status: 'rate_limited' };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { endpoint, params } = parsed.data;
    
    if (!TWELVEDATA_API_KEY) {
      throw new Error('TWELVEDATA_API_KEY not configured');
    }

    let url: string;
    const queryParams = new URLSearchParams({ apikey: TWELVEDATA_API_KEY });

    if (typeof params.symbol === 'string') {
      const symbols = params.symbol
        .split(',')
        .map((symbol: string) => symbol.trim().toUpperCase())
        .filter((symbol: string) => ALLOWED_SYMBOLS.has(symbol));
      if (symbols.length === 0) {
        return new Response(JSON.stringify(emptyPayload(endpoint)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      params.symbol = [...new Set(symbols)].sort().join(',');
    }

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    switch (endpoint) {
      case 'cryptocurrencies':
        // Get list of available cryptocurrencies
        url = `${BASE_URL}/cryptocurrencies?${queryParams}`;
        break;
        
      case 'quote':
        // Get real-time quote for specific symbols
        if (params?.symbol) {
          queryParams.append('symbol', params.symbol);
        }
        url = `${BASE_URL}/quote?${queryParams}`;
        break;
        
      case 'price':
        // Get simple price
        if (params?.symbol) {
          queryParams.append('symbol', params.symbol);
        }
        url = `${BASE_URL}/price?${queryParams}`;
        break;
        
      case 'time_series':
        // Get historical data
        if (params?.symbol) {
          queryParams.append('symbol', params.symbol);
        }
        if (params?.interval) {
          queryParams.append('interval', params.interval);
        }
        if (params?.outputsize) {
          queryParams.append('outputsize', params.outputsize);
        }
        url = `${BASE_URL}/time_series?${queryParams}`;
        break;
        
      case 'exchange_rate':
        // Get exchange rate
        if (params?.symbol) {
          queryParams.append('symbol', params.symbol);
        }
        url = `${BASE_URL}/exchange_rate?${queryParams}`;
        break;
        
      case 'crypto_exchanges':
        // Get list of crypto exchanges
        url = `${BASE_URL}/cryptocurrency_exchanges?${queryParams}`;
        break;
        
      case 'eod':
        // Get end of day data
        if (params?.symbol) {
          queryParams.append('symbol', params.symbol);
        }
        url = `${BASE_URL}/eod?${queryParams}`;
        break;

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    const response = await fetch(url);
    
    const data = await response.json();
    
    if (data.status === 'error') {
      const isRateLimited = /run out of api credits|limit|rate/i.test(String(data.message || ''));
      if (isRateLimited) {
        if (cached && Date.now() - cached.timestamp < STALE_TTL_MS) {
          return new Response(JSON.stringify(cached.data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
          });
        }
        return new Response(JSON.stringify(emptyPayload(endpoint)), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }
      throw new Error(data.message || 'API Error');
    }

    responseCache.set(cacheKey, { data, timestamp: Date.now() });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in crypto-data function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
