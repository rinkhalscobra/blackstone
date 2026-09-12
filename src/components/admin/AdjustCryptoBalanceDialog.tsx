import { useMemo, useState } from 'react';
import { Bitcoin, Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCryptoPrices } from '@/services/cryptoApi';
import { COMMON_CRYPTO_ASSETS, formatCryptoQuantity, type CryptoBalance } from '@/lib/cryptoBalances';

interface AdjustCryptoBalanceDialogProps {
  customerId: string;
  balances: CryptoBalance[];
  onSuccess: () => void;
  children: React.ReactNode;
}

const CUSTOM_ASSET = 'custom';

export const AdjustCryptoBalanceDialog = ({
  customerId,
  balances,
  onSuccess,
  children,
}: AdjustCryptoBalanceDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assetId, setAssetId] = useState('btc');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const assetOptions = useMemo(() => {
    const options = [...COMMON_CRYPTO_ASSETS] as Array<{ id: string; symbol: string; name: string }>;
    for (const balance of balances) {
      if (!options.some((item) => item.id === balance.crypto_id.toLowerCase())) {
        options.push({
          id: balance.crypto_id.toLowerCase(),
          symbol: balance.crypto_symbol.toUpperCase(),
          name: balance.crypto_name,
        });
      }
    }
    return options;
  }, [balances]);

  const asset = useMemo(() => {
    if (assetId === CUSTOM_ASSET) {
      const symbol = customSymbol.trim().toUpperCase();
      return {
        id: symbol.toLowerCase(),
        symbol,
        name: customName.trim(),
      };
    }
    return assetOptions.find((item) => item.id === assetId) || COMMON_CRYPTO_ASSETS[0];
  }, [assetId, assetOptions, customName, customSymbol]);

  const currentBalance = Number(
    balances.find((item) => item.crypto_id.toLowerCase() === asset.id)?.quantity || 0,
  );
  const numericAmount = Number(amount);
  const nextBalance = currentBalance + (adjustmentType === 'credit' ? numericAmount || 0 : -(numericAmount || 0));
  const customAssetIsValid = assetId !== CUSTOM_ASSET
    || (/^[A-Z0-9]{2,15}$/.test(asset.symbol) && asset.name.length > 0);

  const reset = () => {
    setAssetId('btc');
    setCustomSymbol('');
    setCustomName('');
    setAdjustmentType('credit');
    setAmount('');
    setReason('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customAssetIsValid) {
      toast({ title: 'Enter a valid crypto symbol and name', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: 'Enter an amount greater than zero', variant: 'destructive' });
      return;
    }
    if (nextBalance < 0) {
      toast({ title: `Insufficient ${asset.symbol} balance`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // A quote is helpful for portfolio valuation, but balance entry remains
      // available if the market-data provider does not support a custom asset.
      const prices = await getCryptoPrices([asset.id]);
      const unitPrice = prices[asset.id]?.current_price || 0;
      const { error } = await supabase.rpc('adjust_crypto_balance', {
        p_adjustment_type: adjustmentType,
        p_amount: numericAmount,
        p_crypto_id: asset.id,
        p_crypto_name: asset.name,
        p_crypto_symbol: asset.symbol,
        p_customer_id: customerId,
        p_reason: reason.trim() || undefined,
        p_unit_price: unitPrice,
      });

      if (error) throw error;

      toast({
        title: 'Crypto balance updated',
        description: `${adjustmentType === 'credit' ? 'Added' : 'Deducted'} ${formatCryptoQuantity(numericAmount, asset.symbol)}`,
      });
      setOpen(false);
      reset();
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Could not update crypto balance',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5 text-primary" />
            Adjust crypto balance
          </DialogTitle>
          <DialogDescription>
            Add or deduct the exact coin quantity. Every change is saved in the audit history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crypto-asset">Cryptocurrency</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger id="crypto-asset"><SelectValue /></SelectTrigger>
              <SelectContent>
                {assetOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name} ({item.symbol})</SelectItem>
                ))}
                <SelectItem value={CUSTOM_ASSET}>Other cryptocurrency…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assetId === CUSTOM_ASSET && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="crypto-symbol">Symbol</Label>
                <Input
                  id="crypto-symbol"
                  value={customSymbol}
                  onChange={(event) => setCustomSymbol(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                  placeholder="e.g. LTC"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crypto-name">Name</Label>
                <Input
                  id="crypto-name"
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="e.g. Litecoin"
                  maxLength={80}
                  required
                />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="text-xs text-muted-foreground">Current balance</p>
            <p className="mt-1 text-xl font-semibold">{formatCryptoQuantity(currentBalance, asset.symbol || '—')}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={adjustmentType === 'credit' ? 'default' : 'outline'} onClick={() => setAdjustmentType('credit')}>
              <Plus className="mr-2 h-4 w-4" /> Credit
            </Button>
            <Button type="button" variant={adjustmentType === 'debit' ? 'default' : 'outline'} onClick={() => setAdjustmentType('debit')}>
              <Minus className="mr-2 h-4 w-4" /> Debit
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="crypto-amount">Amount ({asset.symbol || 'crypto'})</Label>
            <Input
              id="crypto-amount"
              type="number"
              inputMode="decimal"
              min="0.00000001"
              step="0.00000001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00000000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="crypto-reason">Reason <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="crypto-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this balance being changed?"
              maxLength={500}
              className="min-h-20"
            />
          </div>

          {numericAmount > 0 && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">New balance</p>
              <p className={`mt-1 text-lg font-bold ${nextBalance < 0 ? 'text-destructive' : 'text-primary'}`}>
                {formatCryptoQuantity(nextBalance, asset.symbol || '—')}
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || !customAssetIsValid || !(numericAmount > 0) || nextBalance < 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {adjustmentType === 'credit' ? 'Credit crypto balance' : 'Debit crypto balance'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdjustCryptoBalanceDialog;
