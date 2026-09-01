import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCryptoPrices } from "@/services/cryptoApi";
import { formatEuro } from "@/lib/utils";

interface PortfolioItem {
  id: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  quantity: number;
  purchase_price: number;
  wallet_address?: string | null;
}

interface EditPortfolioItemDialogProps {
  portfolioItem: PortfolioItem;
  onSuccess: () => void;
  children?: React.ReactNode;
}

export const EditPortfolioItemDialog = ({ portfolioItem, onSuccess, children }: EditPortfolioItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [amountEUR, setAmountEUR] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Fetch live price when dialog opens
  useEffect(() => {
    if (open) {
      // Calculate current EUR amount from existing data
      const currentValue = portfolioItem.quantity * portfolioItem.purchase_price;
      setAmountEUR(currentValue.toFixed(2));
      setWalletAddress(portfolioItem.wallet_address || "");
      setStep('input');

      const fetchPrice = async () => {
        setFetchingPrice(true);
        try {
          const prices = await getCryptoPrices([portfolioItem.crypto_id]);
          const price = prices[portfolioItem.crypto_id]?.current_price;
          setLivePrice(price || null);
        } catch (error) {
          console.error("Error fetching price:", error);
          setLivePrice(null);
        } finally {
          setFetchingPrice(false);
        }
      };

      fetchPrice();
    }
  }, [open, portfolioItem]);

  // Calculate quantity based on EUR amount and live price
  const calculatedQuantity = amountEUR && livePrice 
    ? parseFloat(amountEUR) / livePrice 
    : null;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!livePrice || !calculatedQuantity || calculatedQuantity <= 0) return;
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!livePrice || !calculatedQuantity) return;

    setLoading(true);
    const { error } = await supabase
      .from("portfolio_items")
      .update({
        quantity: calculatedQuantity,
        purchase_price: livePrice,
        wallet_address: walletAddress || null,
      })
      .eq("id", portfolioItem.id);

    setLoading(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('customerDetail.errorUpdatingPortfolio'),
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('customerDetail.portfolioUpdated'),
      });
      setOpen(false);
      onSuccess();
    }
  };

  const canContinue = livePrice && calculatedQuantity && calculatedQuantity > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('customerDetail.editPortfolio')}</DialogTitle>
        </DialogHeader>
        
        {/* Crypto header */}
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-sm font-bold">
            {portfolioItem.crypto_symbol.substring(0, 2)}
          </div>
          <div>
            <p className="font-medium">{portfolioItem.crypto_name}</p>
            <p className="text-sm text-muted-foreground">{portfolioItem.crypto_symbol.toUpperCase()}</p>
          </div>
        </div>

        {step === 'input' ? (
          <form onSubmit={handleContinue} className="space-y-4">
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
                    <span className="font-medium">{formatEuro(livePrice)} / {portfolioItem.crypto_symbol}</span>
                  </div>
                  {calculatedQuantity && calculatedQuantity > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('portfolio.calculated')}:</span>
                      <span className="font-medium text-primary">
                        ~{calculatedQuantity.toFixed(8)} {portfolioItem.crypto_symbol}
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

            <div className="space-y-2">
              <Label>{t('portfolio.walletAddress')} ({t('common.optional')})</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!canContinue}
              >
                {t('portfolio.reviewCalculation')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Confirmation step */}
            <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium text-center mb-3">{t('portfolio.confirmCalculation')}</p>
              
              <div className="flex items-center justify-center gap-2 text-lg font-mono">
                <span>{formatEuro(parseFloat(amountEUR))}</span>
                <span className="text-muted-foreground">÷</span>
                <span>{formatEuro(livePrice!)}/{portfolioItem.crypto_symbol}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary">
                <span>=</span>
                <span>{calculatedQuantity?.toFixed(8)} {portfolioItem.crypto_symbol}</span>
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
                    {t('common.loading')}
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

export default EditPortfolioItemDialog;
