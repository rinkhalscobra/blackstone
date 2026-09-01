import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Loader2, RefreshCw } from 'lucide-react';

interface Group {
  id: string;
  name: string;
}

interface CreatePromocodeDialogProps {
  groups: Group[];
  onSuccess: () => void;
}

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const CreatePromocodeDialog = ({ groups, onSuccess }: CreatePromocodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [roleType, setRoleType] = useState<string>('user');
  const [usageLimit, setUsageLimit] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) setCode(generateCode());
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !groupId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('promocodes').insert({
        code: code.trim().toUpperCase(),
        group_id: groupId,
        role_type: roleType as any,
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        expires_at: expiresAt || null,
      });

      if (error) throw error;

      toast({ title: t('dialogs.promocodeCreated'), description: `${code} ${t('dialogs.codeCreated')}` });
      setCode('');
      setGroupId('');
      setRoleType('user');
      setUsageLimit('');
      setExpiresAt('');
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
          <DialogTitle>{t('dialogs.createPromocode')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{t('admin.code')}</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PROMOCODE"
                required
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setCode(generateCode())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">{t('dialogs.assignToGroup')}</Label>
            <Select value={groupId} onValueChange={setGroupId} required>
              <SelectTrigger>
                <SelectValue placeholder={t('dialogs.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('admin.roleType')}</Label>
            <Select value={roleType} onValueChange={setRoleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limit">{t('dialogs.usageLimitOptional')}</Label>
              <Input
                id="limit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder={t('admin.unlimited')}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">{t('dialogs.expiresAtOptional')}</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !groupId} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('dialogs.createPromocodeBtn')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
