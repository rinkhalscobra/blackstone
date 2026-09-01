import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddWatchlistDialog } from "@/components/AddWatchlistDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCryptoPrices, CryptoPrice } from "@/services/cryptoApi";
import { Trash2, TrendingUp, TrendingDown, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface WatchlistItem {
  id: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  created_at: string;
}

const WatchlistNew = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWatchlist = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching watchlist:", error);
    } else {
      setWatchlistItems(data || []);
      
      // Fetch prices for all cryptos
      const cryptoIds = [...new Set(data?.map(item => item.crypto_id) || [])];
      if (cryptoIds.length > 0) {
        const prices = await getCryptoPrices(cryptoIds);
        setCryptoPrices(prices);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchWatchlist();
    }
  }, [user, authLoading]);

  // Refresh prices every 30 seconds
  useEffect(() => {
    if (watchlistItems.length === 0) return;

    const interval = setInterval(async () => {
      const cryptoIds = [...new Set(watchlistItems.map(item => item.crypto_id))];
      const prices = await getCryptoPrices(cryptoIds);
      setCryptoPrices(prices);
    }, 30000);

    return () => clearInterval(interval);
  }, [watchlistItems]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('crypto.failedToRemove'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('crypto.removedFromWatchlist'),
      });
      fetchWatchlist();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navigation />
        <main className="pt-8 pb-12">
          <div className="container mx-auto px-4 text-center">
            <Star className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl font-bold mb-6">{t('crypto.myWatchlist')}</h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t('crypto.pleaseLoginWatchlist')}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Navigation />
        <main className="pt-8 pb-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-lg">{t('crypto.loadingWatchlist')}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('crypto.myWatchlist')}</h1>
              <p className="text-muted-foreground">
                {t('crypto.trackFavorites')}
              </p>
            </div>
            <AddWatchlistDialog onSuccess={fetchWatchlist} />
          </div>

          {watchlistItems.length === 0 ? (
            <Card className="bg-secondary/50 border-border p-12 text-center">
              <Star className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">{t('crypto.watchlistEmptyNew')}</h2>
              <p className="text-lg text-muted-foreground mb-6">
                {t('crypto.startTracking')}
              </p>
              <AddWatchlistDialog onSuccess={fetchWatchlist} />
            </Card>
          ) : (
            <div className="grid gap-4">
              {watchlistItems.map((item) => {
                const price = cryptoPrices[item.crypto_id];
                const priceChange = price?.price_change_percentage_24h || 0;

                return (
                  <Card key={item.id} className="bg-secondary/50 border-border p-6 hover:bg-secondary/70 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {price?.image && (
                          <img 
                            src={price.image} 
                            alt={item.crypto_name} 
                            className="w-14 h-14 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{item.crypto_name}</h3>
                          <p className="text-sm text-muted-foreground">{item.crypto_symbol}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">{t('crypto.currentPrice')}</p>
                          <p className="text-2xl font-bold">
                            €{price?.current_price.toLocaleString() || '---'}
                          </p>
                        </div>

                        <div className="text-right min-w-[120px]">
                          <p className="text-sm text-muted-foreground mb-1">{t('crypto.change24h')}</p>
                          <div className={`flex items-center justify-end gap-1 text-lg font-semibold ${
                            priceChange >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {priceChange >= 0 ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : (
                              <TrendingDown className="h-5 w-5" />
                            )}
                            <span>
                              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default WatchlistNew;
