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
import { Textarea } from '@/components/ui/textarea';
import { Key, Loader2, Copy, RefreshCw, Eye, EyeOff, Clock } from 'lucide-react';

interface ResetPasswordDialogProps {
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

export default function ResetPasswordDialog({ userId, userEmail, onSuccess, children }: ResetPasswordDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [reason, setReason] = useState('');
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

  const handleSubmitRequest = async () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create a password reset request
      const { error } = await supabase
        .from('password_reset_requests')
        .insert({
          target_user_id: userId,
          requested_by: user.id,
          new_password_hash: newPassword, // Store temporarily for approval
          reason: reason.trim() || null,
        });

      if (error) {
        throw error;
      }

      toast({
        title: t('common.success'),
        description: t('customerDetail.resetRequestSubmitted'),
      });

      setOpen(false);
      setNewPassword('');
      setReason('');
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
      setReason('');
      setShowPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Key className="h-4 w-4 mr-2" />
            {t('customerDetail.requestPasswordReset')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('customerDetail.requestPasswordReset')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('customerDetail.resetRequestDescription')} {userEmail || userId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('customerDetail.newPassword')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="newPassword"
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
                title={t('customerDetail.copyPassword')}
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

          <div className="space-y-2">
            <Label htmlFor="reason">{t('customerDetail.resetReason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('customerDetail.resetReasonPlaceholder')}
              rows={2}
            />
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {t('customerDetail.resetApprovalNote')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmitRequest} disabled={loading || !newPassword.trim()}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('customerDetail.submitRequest')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
