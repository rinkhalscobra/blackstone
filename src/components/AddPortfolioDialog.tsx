import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ArrowRight, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCryptoPrices } from "@/services/cryptoApi";
import { formatEuro } from "@/lib/utils";

// Only allow these 5 cryptos for portfolios
const ALLOWED_CRYPTOS = [
  { id: "btc", name: "Bitcoin", symbol: "BTC" },
  { id: "eth", name: "Ethereum", symbol: "ETH" },
  { id: "usdt", name: "Tether", symbol: "USDT" },
  { id: "sol", name: "Solana", symbol: "SOL" },
  { id: "xrp", name: "XRP", symbol: "XRP" },
];

interface AddPortfolioDialogProps {
  onSuccess: () => void;
}

export const AddPortfolioDialog = ({ onSuccess }: AddPortfolioDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [selectedCryptoId, setSelectedCryptoId] = useState("");
  const [amountEUR, setAmountEUR] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const selectedCrypto = ALLOWED_CRYPTOS.find(c => c.id === selectedCryptoId);

  // Fetch live price when crypto is selected
  useEffect(() => {
    if (!selectedCryptoId) {
      setLivePrice(null);
      return;
    }

    const fetchPrice = async () => {
      setFetchingPrice(true);
      try {
        const prices = await getCryptoPrices([selectedCryptoId]);
        const price = prices[selectedCryptoId]?.current_price;
        setLivePrice(price || null);
      } catch (error) {
        console.error("Error fetching price:", error);
        setLivePrice(null);
      } finally {
        setFetchingPrice(false);
      }
    };

    fetchPrice();
  }, [selectedCryptoId]);

  // Calculate quantity based on EUR amount and live price
  const calculatedQuantity = amountEUR && livePrice 
    ? parseFloat(amountEUR) / livePrice 
    : null;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrypto || !user || !livePrice || !calculatedQuantity || calculatedQuantity <= 0) return;
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedCrypto || !user || !livePrice || !calculatedQuantity) return;

    setLoading(true);
    const { error } = await supabase.from("portfolio_items").insert({
      user_id: user.id,
      crypto_id: selectedCrypto.id,
      crypto_name: selectedCrypto.name,
      crypto_symbol: selectedCrypto.symbol,
      quantity: calculatedQuantity,
      purchase_price: livePrice,
    });

    setLoading(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('crypto.errorAddingPortfolio'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('crypto.successAddedPortfolio'),
      });
      setOpen(false);
      setSelectedCryptoId("");
      setAmountEUR("");
      setLivePrice(null);
      setStep('input');
      onSuccess();
    }
  };

  const canContinue = selectedCrypto && livePrice && calculatedQuantity && calculatedQuantity > 0;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setStep('input');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4 mr-2" />
          {t('crypto.addCrypto')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('crypto.addToPortfolio')}</DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('crypto.selectCryptocurrency')}</Label>
              <Select value={selectedCryptoId} onValueChange={setSelectedCryptoId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('crypto.selectCrypto')} />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_CRYPTOS.map((crypto) => (
                    <SelectItem key={crypto.id} value={crypto.id}>
                      <span className="font-medium">{crypto.name}</span>
                      <span className="text-muted-foreground ml-2">({crypto.symbol})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('portfolio.amountToDisplay')} (EUR)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="50000"
                value={amountEUR}
                onChange={(e) => setAmountEUR(e.target.value)}
                required
              />
            </div>

            {/* Live price and calculation preview */}
            {selectedCryptoId && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                {fetchingPrice ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('portfolio.fetchingPrice')}
                  </div>
                ) : livePrice ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('portfolio.livePrice')}:</span>
                      <span className="font-medium">{formatEuro(livePrice)} / {selectedCrypto?.symbol}</span>
                    </div>
                    {calculatedQuantity && calculatedQuantity > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('portfolio.calculated')}:</span>
                        <span className="font-medium text-primary">
                          ~{calculatedQuantity.toFixed(8)} {selectedCrypto?.symbol}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-destructive">
                    {t('portfolio.priceUnavailable')}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!canContinue}
            >
              {t('portfolio.reviewCalculation')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Crypto header */}
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">
                {selectedCrypto?.symbol.substring(0, 2)}
              </div>
              <div>
                <p className="font-medium">{selectedCrypto?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCrypto?.symbol}</p>
              </div>
            </div>

            {/* Confirmation step */}
            <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium text-center mb-3">{t('portfolio.confirmCalculation')}</p>
              
              <div className="flex items-center justify-center gap-2 text-lg font-mono">
                <span>{formatEuro(parseFloat(amountEUR))}</span>
                <span className="text-muted-foreground">÷</span>
                <span>{formatEuro(livePrice!)}/{selectedCrypto?.symbol}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary">
                <span>=</span>
                <span>{calculatedQuantity?.toFixed(8)} {selectedCrypto?.symbol}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep('input')}
              >
                {t('common.back')}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('crypto.adding')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('portfolio.confirmAndSave')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
