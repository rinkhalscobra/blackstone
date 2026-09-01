import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Building, Wallet, Send, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useToast } from '@/hooks/use-toast';
import { cn, formatEuro } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCryptoPrices } from '@/services/cryptoApi';

type WithdrawMethod = 'bank_transfer' | 'crypto_wallet' | 'wire_transfer';

const SUPPORTED_CRYPTOS = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether' },
  { id: 'sol', symbol: 'SOL', name: 'Solana' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP' },
];

interface HoldingRow { crypto_id: string; quantity: number; }

export const WithdrawForm = () => {
  const { user } = useAuth();
  const { balance } = useCustomerData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod>('bank_transfer');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cryptoId, setCryptoId] = useState<string>('btc');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);

  const withdrawMethods = [
    { id: 'bank_transfer' as WithdrawMethod, label: t('withdraw.bankTransfer'), icon: Building, description: t('withdraw.directToBank') },
    { id: 'crypto_wallet' as WithdrawMethod, label: t('withdraw.cryptoWallet'), icon: Wallet, description: t('withdraw.toWalletAddress') },
    { id: 'wire_transfer' as WithdrawMethod, label: t('withdraw.wireTransfer'), icon: Send, description: t('withdraw.internationalWire') },
  ];

  const availableBalance = balance?.balance || 0;
  const requestedAmount = parseFloat(amount) || 0;
  const insufficientFunds = requestedAmount > availableBalance;
  const heldQty = holdings.find(h => h.crypto_id === cryptoId)?.quantity || 0;
  const requestedQty = parseFloat(quantity) || 0;
  const insufficientCrypto = method === 'crypto_wallet' && requestedQty > heldQty;

  // Load user's crypto holdings
  useEffect(() => {
    if (!user) return;
    supabase
      .from('portfolio_items')
      .select('crypto_id, quantity')
      .eq('user_id', user.id)
      .then(({ data }) => setHoldings((data as HoldingRow[]) || []));
  }, [user]);

  // Live price
  useEffect(() => {
    if (method !== 'crypto_wallet' || !cryptoId) return;
    let cancelled = false;
    setPriceLoading(true);
    getCryptoPrices([cryptoId])
      .then((prices) => {
        if (cancelled) return;
        setUnitPrice(prices[cryptoId]?.current_price || 0);
      })
      .finally(() => !cancelled && setPriceLoading(false));
    return () => { cancelled = true; };
  }, [method, cryptoId]);

  // Auto EUR amount
  useEffect(() => {
    if (method !== 'crypto_wallet') return;
    if (requestedQty > 0 && unitPrice > 0) {
      setAmount((requestedQty * unitPrice).toFixed(2));
    }
  }, [requestedQty, unitPrice, method]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || requestedAmount <= 0) {
      toast({
        title: t('withdraw.invalidAmount'),
        description: t('withdraw.enterValidAmount'),
        variant: 'destructive',
      });
      return;
    }

    if (insufficientFunds) {
      toast({
        title: t('withdraw.insufficientFunds'),
        description: t('withdraw.notEnoughBalance'),
        variant: 'destructive',
      });
      return;
    }

    if (method === 'crypto_wallet') {
      if (!cryptoId || requestedQty <= 0) {
        toast({ title: t('withdraw.invalidAmount'), description: 'Select a crypto and enter a valid quantity.', variant: 'destructive' });
        return;
      }
      if (insufficientCrypto) {
        toast({ title: 'Insufficient crypto', description: `You only hold ${heldQty} ${cryptoId.toUpperCase()}.`, variant: 'destructive' });
        return;
      }
    }

    if (!destination.trim()) {
      toast({
        title: t('withdraw.missingDestination'),
        description: t('withdraw.enterDestination'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selected = SUPPORTED_CRYPTOS.find(c => c.id === cryptoId);
      const payload: any = {
        customer_id: user.id,
        type: 'withdraw',
        amount: requestedAmount,
        method,
        notes: `Destination: ${destination}${notes ? `\n${notes}` : ''}`,
        currency: 'EUR',
        status: 'pending',
      };
      if (method === 'crypto_wallet' && selected) {
        payload.crypto_id = selected.id;
        payload.crypto_symbol = selected.symbol;
        payload.crypto_name = selected.name;
        payload.quantity = requestedQty;
        payload.unit_price = unitPrice || (requestedAmount / requestedQty);
      }
      const { error } = await supabase.from('transaction_requests').insert(payload);

      if (error) throw error;

      toast({
        title: t('withdraw.requestSubmitted'),
        description: t('withdraw.requestPending'),
      });

      navigate('/dashboard/transactions');
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: t('withdraw.error'),
        description: t('withdraw.failedToSubmit'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ArrowUpRight className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle>{t('withdraw.title')}</CardTitle>
            <CardDescription>
              {t('withdraw.availableBalance')}: {formatEuro(availableBalance)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('withdraw.amountLabel')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={availableBalance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn("pl-8 text-lg", insufficientFunds && "border-destructive")}
                required
              />
            </div>
            {insufficientFunds && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('withdraw.insufficientFundsAlert').replace('{balance}', availableBalance.toFixed(2))}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Withdrawal Method */}
          <div className="space-y-2">
            <Label>{t('withdraw.withdrawalMethod')}</Label>
            <div className="grid grid-cols-3 gap-3">
              {withdrawMethods.map((wm) => {
                const Icon = wm.icon;
                return (
                  <button
                    key={wm.id}
                    type="button"
                    onClick={() => setMethod(wm.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-colors",
                      method === wm.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-6 w-6 mb-2",
                      method === wm.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className="font-medium text-foreground text-sm">{wm.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crypto selection */}
          {method === 'crypto_wallet' && (
            <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={cryptoId} onValueChange={setCryptoId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CRYPTOS.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.symbol} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    step="0.00000001"
                    min="0"
                    max={heldQty || undefined}
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={cn(insufficientCrypto && "border-destructive")}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>
                  {priceLoading ? 'Loading price…' : unitPrice > 0
                    ? `Price: ${formatEuro(unitPrice)} / ${SUPPORTED_CRYPTOS.find(c => c.id === cryptoId)?.symbol}`
                    : 'Price unavailable'}
                </span>
                <span>Holding: {heldQty} {SUPPORTED_CRYPTOS.find(c => c.id === cryptoId)?.symbol}</span>
              </div>
              {insufficientCrypto && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Insufficient crypto balance.</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">
              {method === 'crypto_wallet' ? t('withdraw.walletAddress') : 
               method === 'bank_transfer' ? t('withdraw.bankAccountDetails') :
               t('withdraw.wireTransferDetails')}
            </Label>
            <Textarea
              id="destination"
              placeholder={
                method === 'crypto_wallet' ? t('withdraw.walletAddressPlaceholder') :
                method === 'bank_transfer' ? t('withdraw.bankDetailsPlaceholder') :
                t('withdraw.wireDetailsPlaceholder')
              }
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('withdraw.notesLabel')}</Label>
            <Textarea
              id="notes"
              placeholder={t('withdraw.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Processing info */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <h4 className="font-medium text-foreground mb-2">{t('withdraw.processingTime')}</h4>
            <p className="text-sm text-muted-foreground">
              {method === 'crypto_wallet' && t('withdraw.cryptoProcessing')}
              {method === 'bank_transfer' && t('withdraw.bankProcessing')}
              {method === 'wire_transfer' && t('withdraw.wireProcessing')}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              {t('withdraw.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || insufficientFunds || insufficientCrypto} 
              className="flex-1"
            >
              {isSubmitting ? t('withdraw.submitting') : t('withdraw.submitRequest')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
