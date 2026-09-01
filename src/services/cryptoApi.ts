import { getCryptoQuotes } from "@/services/twelveDataApi";

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

export interface CryptoSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

// Crypto name mappings
const CRYPTO_NAMES: Record<string, string> = {
  'btc': 'Bitcoin',
  'eth': 'Ethereum',
  'xrp': 'XRP',
  'usdt': 'Tether',
  'sol': 'Solana'
};

// Search cryptos - returns a list matching the query
export const searchCryptos = async (query: string): Promise<CryptoSearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  const queryLower = query.toLowerCase();
  return Object.entries(CRYPTO_NAMES)
    .filter(([symbol, name]) => symbol.includes(queryLower) || name.toLowerCase().includes(queryLower))
    .map(([symbol, name]) => ({ id: symbol, name, symbol: symbol.toUpperCase(), thumb: '' }));
};

// Get prices for multiple crypto IDs
export const getCryptoPrices = async (ids: string[]): Promise<Record<string, CryptoPrice>> => {
  if (ids.length === 0) return {};
  
  try {
    // Convert IDs to 12data format (SYMBOL/USD) - only add /USD if not already present
    const symbols = ids.map(id => {
      const upper = id.toUpperCase();
      return upper.includes('/USD') ? upper : `${upper}/USD`;
    });
    
    const data = await getCryptoQuotes(symbols);
    
    const pricesMap: Record<string, CryptoPrice> = {};
    
    Object.entries(data).forEach(([symbol, quote]) => {
      const id = symbol.split('/')[0].toLowerCase();
      pricesMap[id] = {
        id,
        symbol: symbol.split('/')[0],
        name: CRYPTO_NAMES[id] || id,
        current_price: parseFloat(quote.close || '0'),
        price_change_percentage_24h: parseFloat(quote.percent_change || '0'),
        image: ''
      };
    });
    
    return pricesMap;
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return {};
  }
};
