import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, CreditCard, Building, Wallet, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn, formatEuro } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCryptoPrices } from '@/services/cryptoApi';

type PaymentMethod = 'bank_transfer' | 'crypto_wallet' | 'credit_card' | 'wire_transfer';

const SUPPORTED_CRYPTOS = [
  { id: 'btc', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'eth', symbol: 'ETH', name: 'Ethereum' },
  { id: 'usdt', symbol: 'USDT', name: 'Tether' },
  { id: 'sol', symbol: 'SOL', name: 'Solana' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP' },
];

export const DepositForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cryptoId, setCryptoId] = useState<string>('btc');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);

  const paymentMethods = [
    { id: 'bank_transfer' as PaymentMethod, label: t('deposit.bankTransfer'), icon: Building, description: t('deposit.directBankWire') },
    { id: 'crypto_wallet' as PaymentMethod, label: t('deposit.cryptoWallet'), icon: Wallet, description: t('deposit.cryptoDesc') },
    { id: 'credit_card' as PaymentMethod, label: t('deposit.creditCard'), icon: CreditCard, description: t('deposit.creditCardDesc') },
    { id: 'wire_transfer' as PaymentMethod, label: t('deposit.wireTransfer'), icon: Send, description: t('deposit.internationalWire') },
  ];

  // Fetch live price for selected crypto when crypto method is active
  useEffect(() => {
    if (method !== 'crypto_wallet' || !cryptoId) return;
    let cancelled = false;
    setPriceLoading(true);
    getCryptoPrices([cryptoId])
      .then((prices) => {
        if (cancelled) return;
        const p = prices[cryptoId]?.current_price || 0;
        setUnitPrice(p);
      })
      .finally(() => !cancelled && setPriceLoading(false));
    return () => { cancelled = true; };
  }, [method, cryptoId]);

  // Auto-compute EUR amount from quantity × unit price
  useEffect(() => {
    if (method !== 'crypto_wallet') return;
    const q = parseFloat(quantity);
    if (!isNaN(q) && q > 0 && unitPrice > 0) {
      setAmount((q * unitPrice).toFixed(2));
    }
  }, [quantity, unitPrice, method]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || parseFloat(amount) <= 0) {
      toast({
        title: t('deposit.invalidAmount'),
        description: t('deposit.enterValidAmount'),
        variant: 'destructive',
      });
      return;
    }

    const isCrypto = method === 'crypto_wallet';
    const q = parseFloat(quantity);
    if (isCrypto && (!cryptoId || isNaN(q) || q <= 0)) {
      toast({
        title: t('deposit.invalidAmount'),
        description: 'Select a crypto and enter a valid quantity.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selected = SUPPORTED_CRYPTOS.find(c => c.id === cryptoId);
      const payload: any = {
        customer_id: user.id,
        type: 'deposit',
        amount: parseFloat(amount),
        method,
        notes: notes || null,
        currency: 'EUR',
        status: 'pending',
      };
      if (isCrypto && selected) {
        payload.crypto_id = selected.id;
        payload.crypto_symbol = selected.symbol;
        payload.crypto_name = selected.name;
        payload.quantity = q;
        payload.unit_price = unitPrice || (parseFloat(amount) / q);
      }
      const { error } = await supabase.from('transaction_requests').insert(payload);

      if (error) throw error;

      toast({
        title: t('deposit.requestSubmitted'),
        description: t('deposit.requestPending'),
      });

      navigate('/dashboard/transactions');
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast({
        title: t('deposit.error'),
        description: t('deposit.failedToSubmit'),
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
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
            <ArrowDownRight className="h-6 w-6 text-success" />
          </div>
          <div>
            <CardTitle>{t('deposit.title')}</CardTitle>
            <CardDescription>{t('deposit.subtitle')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('deposit.amountLabel')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>{t('deposit.paymentMethod')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setMethod(pm.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-colors",
                      method === pm.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-6 w-6 mb-2",
                      method === pm.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div className="font-medium text-foreground">{pm.label}</div>
                    <div className="text-xs text-muted-foreground">{pm.description}</div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Crypto selection (only for crypto wallet) */}
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
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {priceLoading ? 'Loading price…' : unitPrice > 0
                  ? `Current price: ${formatEuro(unitPrice)} per ${SUPPORTED_CRYPTOS.find(c => c.id === cryptoId)?.symbol}`
                  : 'Price unavailable'}
              </div>
            </div>
          )}



          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('deposit.notesLabel')}</Label>
            <Textarea
              id="notes"
              placeholder={t('deposit.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Instructions based on method */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <h4 className="font-medium text-foreground mb-2">{t('deposit.paymentInstructions')}</h4>
            {method === 'bank_transfer' && (
              <p className="text-sm text-muted-foreground">
                {t('deposit.bankTransferInstructions')}
              </p>
            )}
            {method === 'crypto_wallet' && (
              <p className="text-sm text-muted-foreground">
                {t('deposit.cryptoInstructions')}
              </p>
            )}
            {method === 'credit_card' && (
              <p className="text-sm text-muted-foreground">
                {t('deposit.creditCardInstructions')}
              </p>
            )}
            {method === 'wire_transfer' && (
              <p className="text-sm text-muted-foreground">
                {t('deposit.wireTransferInstructions')}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              {t('deposit.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? t('deposit.submitting') : t('deposit.submitRequest')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
