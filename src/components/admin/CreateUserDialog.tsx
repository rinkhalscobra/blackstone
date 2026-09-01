import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Loader2 } from 'lucide-react';

interface Group {
  id: string;
  name: string;
}

interface CreateUserDialogProps {
  groups: Group[];
  roleType: 'agent' | 'supervisor';
  onSuccess: () => void;
}

export const CreateUserDialog = ({ groups, roleType, onSuccess }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      toast({ 
        title: "Note", 
        description: `${t('dialogs.noteInvite')} ${groups.find(g => g.id === groupId)?.name} - ${email}`,
      });
      
      setOpen(false);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = roleType === 'agent' ? t('admin.agents') : t('admin.supervisors');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> {t('common.create').toUpperCase()}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{t('dialogs.createUser')} {roleLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('auth.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('auth.lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('admin.username')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('common.phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('dialogs.assignToGroup')}</Label>
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
          <p className="text-sm text-muted-foreground">
            {t('dialogs.noteInvite')}
          </p>
          <Button type="submit" disabled={loading || !groupId} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('common.create')} {roleLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
