import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { searchCryptos, getCryptoPrices, CryptoSearchResult, CryptoPrice } from "@/services/cryptoApi";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface CryptoSearchProps {
  onSelect?: (crypto: CryptoSearchResult) => void;
  showPriceDetails?: boolean;
  className?: string;
}

const CryptoSearch = ({ onSelect, showPriceDetails = true, className }: CryptoSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CryptoSearchResult[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSearchResult | null>(null);
  const [priceData, setPriceData] = useState<CryptoPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const searchResults = await searchCryptos(query);
          setResults(searchResults);
        } catch (error) {
          console.error("Search error:", error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = async (crypto: CryptoSearchResult) => {
    setSelectedCrypto(crypto);
    setQuery("");
    setResults([]);
    onSelect?.(crypto);

    if (showPriceDetails) {
      setLoadingPrice(true);
      try {
        const prices = await getCryptoPrices([crypto.id]);
        if (prices[crypto.id]) {
          setPriceData(prices[crypto.id]);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setLoadingPrice(false);
      }
    }
  };

  const clearSelection = () => {
    setSelectedCrypto(null);
    setPriceData(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('crypto.searchPlaceholderFull')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 bg-secondary/50 border-border"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {results.length > 0 && (
        <Card className="mt-2 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {results.map((crypto) => (
                <button
                  key={crypto.id}
                  onClick={() => handleSelect(crypto)}
                  className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">
                      {crypto.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{crypto.name}</p>
                      <p className="text-sm text-muted-foreground">{crypto.symbol}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Crypto Details */}
      {showPriceDetails && selectedCrypto && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">
                  {selectedCrypto.symbol.charAt(0)}
                </div>
                <div>
                  <p>{selectedCrypto.name}</p>
                  <p className="text-sm text-muted-foreground font-normal">{selectedCrypto.symbol}</p>
                </div>
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPrice ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('crypto.loadingPriceData')}</span>
              </div>
            ) : priceData ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('crypto.currentPrice')}</p>
                  <p className="text-2xl font-bold">
                    ${priceData.current_price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: priceData.current_price < 1 ? 6 : 2
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('crypto.change24h')}</p>
                  <div className={cn(
                    "flex items-center gap-1 text-xl font-semibold",
                    priceData.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {priceData.price_change_percentage_24h >= 0 ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                    {priceData.price_change_percentage_24h >= 0 ? "+" : ""}
                    {priceData.price_change_percentage_24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{t('crypto.priceDataUnavailable')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CryptoSearch;
