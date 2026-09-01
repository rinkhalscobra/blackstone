import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Loader2 } from 'lucide-react';

interface CreateGroupDialogProps {
  onSuccess: () => void;
}

export const CreateGroupDialog = ({ onSuccess }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('groups').insert({
        name: name.trim(),
        description: description.trim() || null,
      });

      if (error) throw error;

      toast({ title: t('dialogs.groupCreated'), description: `${name} ${t('dialogs.groupCreatedDesc')}` });
      setName('');
      setDescription('');
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
          <DialogTitle>{t('dialogs.createGroup')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('dialogs.groupName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dialogs.groupName')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('dialogs.groupDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dialogs.groupDescription')}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('dialogs.createGroupBtn')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
