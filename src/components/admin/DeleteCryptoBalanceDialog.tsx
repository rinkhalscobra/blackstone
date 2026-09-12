import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCryptoQuantity, type CryptoBalance } from '@/lib/cryptoBalances';

interface DeleteCryptoBalanceDialogProps {
  customerId: string;
  balance: CryptoBalance;
  onSuccess: () => void;
}

export const DeleteCryptoBalanceDialog = ({
  customerId,
  balance,
  onSuccess,
}: DeleteCryptoBalanceDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_crypto_balance', {
        p_crypto_id: balance.crypto_id,
        p_customer_id: customerId,
      });

      if (error) throw error;

      toast({
        title: `${balance.crypto_symbol.toUpperCase()} balance deleted`,
        description: `${formatCryptoQuantity(Number(balance.quantity), balance.crypto_symbol)} was removed.`,
      });
      setOpen(false);
      onSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Could not delete crypto balance',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !deleting && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title={`Delete ${balance.crypto_symbol.toUpperCase()} balance`}
          aria-label={`Delete ${balance.crypto_symbol.toUpperCase()} balance`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {balance.crypto_symbol.toUpperCase()} balance?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the complete balance of{' '}
            <strong>{formatCryptoQuantity(Number(balance.quantity), balance.crypto_symbol)}</strong>{' '}
            from this customer. The deletion will remain visible in the adjustment history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {deleting ? 'Deleting…' : 'Delete balance'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCryptoBalanceDialog;

