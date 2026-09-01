import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Loader2 } from 'lucide-react';

interface CreateIPWhitelistDialogProps {
  onSuccess: () => void;
  groupId?: string;
  isAdmin?: boolean;
}

export const CreateIPWhitelistDialog = ({ onSuccess, groupId, isAdmin = false }: CreateIPWhitelistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [ipVersion, setIpVersion] = useState('IPv4');
  const [action, setAction] = useState<string>('ALLOW');
  const [subject, setSubject] = useState('STAFF');
  const [isGlobal, setIsGlobal] = useState(!groupId);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    setLoading(true);
    try {
      const effectiveGroupId = isAdmin && isGlobal ? null : groupId || null;
      
      const { error } = await supabase.from('ip_whitelist').insert({
        ip_address: ipAddress.trim(),
        ip_version: ipVersion,
        action: action as any,
        subject: subject,
        group_id: effectiveGroupId,
      });

      if (error) throw error;

      toast({ title: t('dialogs.ipRuleCreated'), description: `${ipAddress} ${t('dialogs.ipRuleFor')}` });
      setIpAddress('');
      setIpVersion('IPv4');
      setAction('ALLOW');
      setSubject('STAFF');
      setIsGlobal(!groupId);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> {t('common.create').toUpperCase()}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('dialogs.createIPRule')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip">{t('admin.ipAddress')}</Label>
            <Input
              id="ip"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.1 or *"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.ipVersion')}</Label>
              <Select value={ipVersion} onValueChange={setIpVersion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IPv4">IPv4</SelectItem>
                  <SelectItem value="IPv6">IPv6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.action')}</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALLOW">ALLOW</SelectItem>
                  <SelectItem value="DENY">DENY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t('admin.subject')}</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">All Staff in Group</SelectItem>
                <SelectItem value="EVERYONE">Everyone (Legacy)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              IP restrictions only apply to staff logins (Admin, Group Admin, Supervisor, Agent). Clients can login from any IP.
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="global-rule">Global Rule</Label>
                <p className="text-xs text-muted-foreground">
                  Applies to all staff from any group
                </p>
              </div>
              <Switch
                id="global-rule"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('dialogs.createRule')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};