import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search } from "lucide-react";
import { searchCryptos, CryptoSearchResult } from "@/services/cryptoApi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddWatchlistDialogProps {
  onSuccess: () => void;
}

export const AddWatchlistDialog = ({ onSuccess }: AddWatchlistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CryptoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 1) {
      const results = await searchCryptos(query);
      setSearchResults(results.slice(0, 10));
    } else {
      setSearchResults([]);
    }
  };

  const handleAddToWatchlist = async (crypto: CryptoSearchResult) => {
    if (!user) return;

    setLoading(true);
    const { error } = await supabase.from("watchlist_items").insert({
      user_id: user.id,
      crypto_id: crypto.id,
      crypto_name: crypto.name,
      crypto_symbol: crypto.symbol.toUpperCase(),
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        toast({
          title: t('crypto.alreadyInWatchlist'),
          description: t('crypto.alreadyInWatchlistDesc'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('crypto.errorAddingWatchlist'),
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: t('crypto.addedToWatchlist'),
        description: `${crypto.name} ${t('crypto.addedToWatchlistDesc')}`,
      });
      setOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          {t('crypto.addToWatchlist')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('crypto.addToWatchlist')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('crypto.searchCryptocurrency')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('crypto.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-96 overflow-auto">
                  {searchResults.map((crypto) => (
                    <button
                      key={crypto.id}
                      type="button"
                      onClick={() => handleAddToWatchlist(crypto)}
                      disabled={loading}
                      className="w-full px-4 py-3 text-left hover:bg-secondary/50 flex items-center gap-3 transition-colors disabled:opacity-50"
                    >
                      <img src={crypto.thumb} alt={crypto.name} className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {crypto.symbol.toUpperCase()}
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
