import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const MFAVerificationDialog = ({
  open,
  onOpenChange,
  email,
  onVerified,
  onCancel,
}: MFAVerificationDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) {
      toast({
        title: t('common.error'),
        description: 'Please enter a valid code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-validate', {
        body: { email, code },
      });

      if (error) throw error;

      if (data.valid) {
        onVerified();
        setCode('');
        if (data.usedBackupCode) {
          toast({
            title: 'Backup code used',
            description: `You have ${data.remainingBackupCodes} backup codes remaining`,
          });
        }
      } else {
        toast({
          title: t('common.error'),
          description: data.error || 'Invalid verification code',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to verify code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCode('');
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('auth.mfaRequired') || 'Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {t('auth.mfaDescription') || 'Enter the code from your authenticator app'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('auth.verificationCode') || 'Verification Code'}</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={9}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length >= 6) {
                  handleVerify();
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              {t('auth.backupCodeHint') || 'You can also use a backup code (format: XXXX-XXXX)'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleVerify}
              disabled={loading || code.length < 6}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('auth.verify') || 'Verify'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};