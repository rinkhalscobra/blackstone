import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Euro, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AdjustBalanceDialogProps {
  customerId: string;
  currentBalance: number;
  currency: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

const AdjustBalanceDialog = ({ 
  customerId, 
  currentBalance, 
  currency, 
  onSuccess, 
  children 
}: AdjustBalanceDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: t('dialogs.invalidAmount'), variant: "destructive" });
      return;
    }

    if (!reason.trim()) {
      toast({ title: t('dialogs.reasonRequired'), variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      const adjustedAmount = adjustmentType === 'debit' ? -numAmount : numAmount;
      const newBalance = currentBalance + adjustedAmount;

      // Upsert balance - creates row if missing, updates if exists
      const { error: balanceError } = await supabase
        .from('customer_balances')
        .upsert({
          customer_id: customerId,
          balance: newBalance,
          currency: currency,
          updated_at: new Date().toISOString()
        }, { onConflict: 'customer_id' });

      if (balanceError) throw balanceError;


      toast({ 
        title: t('dialogs.balanceUpdated'), 
        description: `${adjustmentType === 'credit' ? t('dialogs.added') : t('dialogs.deducted')} ${formatCurrency(numAmount, currency)}`
      });
      
      setOpen(false);
      setAmount('');
      setReason('');
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            {t('dialogs.adjustBalance')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">{t('dialogs.currentBalance')}</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(currentBalance, currency)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={adjustmentType === 'credit' ? 'default' : 'outline'}
              onClick={() => setAdjustmentType('credit')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> {t('dialogs.credit')}
            </Button>
            <Button
              type="button"
              variant={adjustmentType === 'debit' ? 'default' : 'outline'}
              onClick={() => setAdjustmentType('debit')}
              className="flex items-center gap-2"
            >
              <Minus className="h-4 w-4" /> {t('dialogs.debit')}
            </Button>
          </div>

          <div>
            <Label htmlFor="amount">{t('dialogs.amount')} ({currency.toUpperCase()})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="reason">{t('dialogs.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('dialogs.enterReason')}
              className="mt-1 min-h-[80px]"
            />
          </div>

          {amount && (
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('dialogs.newBalance')}</p>
              <p className={`text-xl font-bold ${adjustmentType === 'credit' ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(currentBalance + (adjustmentType === 'credit' ? parseFloat(amount) || 0 : -(parseFloat(amount) || 0)), currency)}
              </p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {adjustmentType === 'credit' ? t('dialogs.creditBalance') : t('dialogs.debitBalance')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdjustBalanceDialog;
