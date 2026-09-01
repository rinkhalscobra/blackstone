import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Loader2, Copy, RefreshCw, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface DirectPasswordResetDialogProps {
  userId: string;
  userEmail: string | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function DirectPasswordResetDialog({ userId, userEmail, onSuccess, children }: DirectPasswordResetDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGeneratePassword = () => {
    const password = generateSecurePassword();
    setNewPassword(password);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword);
      toast({
        title: t('common.copied'),
        description: t('customerDetail.passwordCopied'),
      });
    }
  };

  const handleDirectReset = async () => {
    if (!newPassword.trim()) {
      toast({
        title: t('common.error'),
        description: t('customerDetail.enterPassword'),
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t('common.error'),
        description: t('customerDetail.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('common.success'),
        description: t('customerDetail.passwordResetSuccess') || 'Password has been reset successfully. The client will be locked out with the old credentials.',
      });

      setOpen(false);
      setNewPassword('');
      setShowPassword(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setNewPassword('');
      setShowPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="destructive" size="sm">
            <ShieldAlert className="h-4 w-4 mr-2" />
            {t('customerDetail.directPasswordReset') || 'Reset Password (Immediate)'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {t('customerDetail.directPasswordReset') || 'Immediate Password Reset'}
          </DialogTitle>
          <DialogDescription>
            {t('customerDetail.directResetDescription') || 'This will immediately change the password for'} {userEmail || userId}. {t('customerDetail.directResetWarning') || 'The client will be locked out with their current credentials.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs text-destructive font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {t('customerDetail.directResetImmediateWarning') || 'This action takes effect immediately and cannot be undone. The client will lose access to the platform with their current password.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="directNewPassword">{t('customerDetail.newPassword')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="directNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('customerDetail.enterNewPassword')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
                disabled={!newPassword}
                title={t('customerDetail.copyPassword') || 'Copy password'}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGeneratePassword}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('customerDetail.generatePassword')}
          </Button>

          {newPassword && showPassword && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">{t('customerDetail.generatedPassword')}:</p>
              <code className="text-sm font-mono break-all">{newPassword}</code>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDirectReset} disabled={loading || !newPassword.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('customerDetail.resetNow') || 'Reset Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
