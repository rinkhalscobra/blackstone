import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ArrowRight, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCryptoPrices } from "@/services/cryptoApi";
import { getExchangeRate } from "@/services/marketDataApi";
import { formatCurrency } from "@/lib/utils";

// Only allow these 5 cryptos for portfolios
const ALLOWED_CRYPTOS = [
  { id: "btc", name: "Bitcoin", symbol: "BTC" },
  { id: "eth", name: "Ethereum", symbol: "ETH" },
  { id: "usdt", name: "Tether", symbol: "USDT" },
  { id: "sol", name: "Solana", symbol: "SOL" },
  { id: "xrp", name: "XRP", symbol: "XRP" },
];

interface AddPortfolioForClientDialogProps {
  customerId: string;
  onSuccess: () => void;
  children?: React.ReactNode;
}

export const AddPortfolioForClientDialog = ({ customerId, onSuccess, children }: AddPortfolioForClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [selectedCryptoId, setSelectedCryptoId] = useState("");
  const [amountEUR, setAmountEUR] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [usdToDisplay, setUsdToDisplay] = useState<number | null>(1);
  const { toast } = useToast();
  const { t } = useLanguage();

  const selectedCrypto = ALLOWED_CRYPTOS.find(c => c.id === selectedCryptoId);

  useEffect(() => {
    void supabase
      .from('profiles')
      .select('preferred_currency, display_currency')
      .eq('id', customerId)
      .single()
      .then(({ data }) => {
        setDisplayCurrency((data?.preferred_currency || data?.display_currency || 'USD').toUpperCase());
      });
  }, [customerId]);

  useEffect(() => {
    if (displayCurrency === 'USD') {
      setUsdToDisplay(1);
      return;
    }
    setUsdToDisplay(null);
    void getExchangeRate('USD', displayCurrency).then(setUsdToDisplay);
  }, [displayCurrency]);

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

  // Live prices are USD; convert them before applying the customer's amount.
  const calculatedQuantity = amountEUR && livePrice && usdToDisplay
    ? parseFloat(amountEUR) / (livePrice * usdToDisplay)
    : null;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrypto || !livePrice || !calculatedQuantity || calculatedQuantity <= 0) return;
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedCrypto || !livePrice || !calculatedQuantity) return;

    setLoading(true);
    const { error } = await supabase.from("portfolio_items").insert({
      user_id: customerId,
      crypto_id: selectedCrypto.id,
      crypto_name: selectedCrypto.name,
      crypto_symbol: selectedCrypto.symbol,
      quantity: calculatedQuantity,
      purchase_price: livePrice,
      wallet_address: walletAddress || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('customerDetail.errorAddingPortfolio'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('customerDetail.portfolioAdded'),
      });
      setOpen(false);
      setSelectedCryptoId("");
      setAmountEUR("");
      setWalletAddress("");
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
        {children || (
          <Button size="sm" className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            {t('customerDetail.addPortfolio')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('customerDetail.addPortfolio')}</DialogTitle>
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
              <Label>{t('portfolio.amountToDisplay')} ({displayCurrency})</Label>
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
                      <span className="font-medium">
                        {usdToDisplay
                          ? `${formatCurrency(livePrice * usdToDisplay, displayCurrency)} / ${selectedCrypto?.symbol}`
                          : t('portfolio.priceUnavailable')}
                      </span>
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

            <div className="space-y-2">
              <Label>{t('portfolio.walletAddress')} ({t('common.optional')})</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>

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
                <span>{formatCurrency(parseFloat(amountEUR), displayCurrency)}</span>
                <span className="text-muted-foreground">÷</span>
                <span>{formatCurrency(livePrice! * usdToDisplay!, displayCurrency)}/{selectedCrypto?.symbol}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary">
                <span>=</span>
                <span>{calculatedQuantity?.toFixed(8)} {selectedCrypto?.symbol}</span>
              </div>
            </div>

            {walletAddress && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">{t('portfolio.walletAddress')}:</p>
                <p className="text-sm font-mono break-all">{walletAddress}</p>
              </div>
            )}

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

export default AddPortfolioForClientDialog;
