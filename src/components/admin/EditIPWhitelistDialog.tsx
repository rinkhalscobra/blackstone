import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pencil, Loader2 } from 'lucide-react';

interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  ip_version: string;
  action: string;
  subject: string;
  group_id: string | null;
}

interface EditIPWhitelistDialogProps {
  entry: IPWhitelistEntry;
  onSuccess: () => void;
  isAdmin?: boolean;
}

export const EditIPWhitelistDialog = ({ entry, onSuccess, isAdmin = false }: EditIPWhitelistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState(entry.ip_address);
  const [ipVersion, setIpVersion] = useState(entry.ip_version);
  const [action, setAction] = useState(entry.action);
  const [subject, setSubject] = useState(entry.subject);
  const [isGlobal, setIsGlobal] = useState(entry.group_id === null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      setIpAddress(entry.ip_address);
      setIpVersion(entry.ip_version);
      setAction(entry.action);
      setSubject(entry.subject);
      setIsGlobal(entry.group_id === null);
    }
  }, [open, entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    setLoading(true);
    try {
      const updateData: any = {
        ip_address: ipAddress.trim(),
        ip_version: ipVersion,
        action: action as any,
        subject: subject,
      };

      // Only admins can toggle global/group-specific
      if (isAdmin) {
        updateData.group_id = isGlobal ? null : entry.group_id;
      }

      const { error } = await supabase
        .from('ip_whitelist')
        .update(updateData)
        .eq('id', entry.id);

      if (error) throw error;

      toast({ title: t('common.success'), description: t('dialogs.ipRuleUpdated') || 'IP rule updated successfully' });
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('dialogs.editIPRule') || 'Edit IP Rule'}</DialogTitle>
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
            {t('common.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
