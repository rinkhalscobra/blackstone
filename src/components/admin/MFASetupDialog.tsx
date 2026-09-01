import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Key } from 'lucide-react';
import QRCode from 'qrcode';

interface MFASetupDialogProps {
  onStatusChange?: (enabled: boolean) => void;
}

export const MFASetupDialog = ({ onStatusChange }: MFASetupDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'disable'>('status');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (open) {
      checkMfaStatus();
    }
  }, [open]);

  const checkMfaStatus = async () => {
    setCheckingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setMfaEnabled(data.isEnabled);
      setStep('status');
    } catch (error: any) {
      console.error('Error checking MFA status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const initiateSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'setup' },
      });

      if (error) throw error;

      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.otpAuthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
      setStep('setup');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to initiate MFA setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: t('common.error'),
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'verify', code: verificationCode },
      });

      if (error) throw error;

      if (data.success) {
        setMfaEnabled(true);
        setStep('status');
        setVerificationCode('');
        onStatusChange?.(true);
        toast({
          title: t('common.success'),
          description: 'Two-factor authentication has been enabled',
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableMfa = async () => {
    if (verificationCode.length < 6) {
      toast({
        title: t('common.error'),
        description: 'Please enter a valid code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-setup', {
        body: { action: 'disable', code: verificationCode },
      });

      if (error) throw error;

      if (data.success) {
        setMfaEnabled(false);
        setStep('status');
        setVerificationCode('');
        onStatusChange?.(false);
        toast({
          title: t('common.success'),
          description: 'Two-factor authentication has been disabled',
        });
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Invalid code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied'),
      description: 'Copied to clipboard',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {mfaEnabled ? <ShieldCheck className="h-4 w-4 text-success" /> : <Shield className="h-4 w-4" />}
          {t('admin.twoFactorAuth') || 'Two-Factor Auth'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('admin.twoFactorAuth') || 'Two-Factor Authentication'}
          </DialogTitle>
          <DialogDescription>
            {t('admin.mfaDescription') || 'Secure your account with Google Authenticator'}
          </DialogDescription>
        </DialogHeader>

        {checkingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Status View */}
            {step === 'status' && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {mfaEnabled ? (
                        <ShieldCheck className="h-8 w-8 text-success" />
                      ) : (
                        <ShieldOff className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {mfaEnabled ? 'MFA Enabled' : 'MFA Disabled'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mfaEnabled 
                            ? 'Your account is protected with 2FA' 
                            : 'Enable 2FA for extra security'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
                      {mfaEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Card>

                {mfaEnabled ? (
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setStep('disable')}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Disable Two-Factor Authentication
                  </Button>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={initiateSetup}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Enable Two-Factor Authentication
                  </Button>
                )}
              </div>
            )}

            {/* Setup View */}
            {step === 'setup' && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with Google Authenticator or any TOTP app:
                  </p>
                  {qrCodeUrl && (
                    <div className="inline-block p-4 bg-white rounded-lg">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Or enter this secret manually:</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(secret)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Backup Codes (save these somewhere safe):</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-xs font-mono">{code}</code>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Backup Codes
                  </Button>
                </div>

                <Button className="w-full" onClick={() => setStep('verify')}>
                  I've saved my backup codes, continue
                </Button>
              </div>
            )}

            {/* Verify View */}
            {step === 'verify' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify setup:
                </p>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('setup')}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={verifyAndEnable}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Verify & Enable
                  </Button>
                </div>
              </div>
            )}

            {/* Disable View */}
            {step === 'disable' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter a code from your authenticator app or a backup code to disable 2FA:
                </p>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    placeholder="000000 or XXXX-XXXX"
                    className="text-center font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('status')}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1" 
                    onClick={disableMfa}
                    disabled={loading || verificationCode.length < 6}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Disable 2FA
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};