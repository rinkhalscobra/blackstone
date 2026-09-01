import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Pencil } from 'lucide-react';

interface EditStaffNameDialogProps {
  userId: string;
  currentFirstName: string | null;
  currentLastName: string | null;
  currentUsername?: string | null;
  onSuccess: () => void;
}

export function EditStaffNameDialog({
  userId,
  currentFirstName,
  currentLastName,
  currentUsername,
  onSuccess,
}: EditStaffNameDialogProps) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(currentFirstName || '');
  const [lastName, setLastName] = useState(currentLastName || '');
  const [username, setUsername] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          username: username.trim() || null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Profile updated successfully',
      });
      setOpen(false);
      onSuccess();
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setFirstName(currentFirstName || '');
      setLastName(currentLastName || '');
      setUsername(currentUsername || '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('common.edit')} Profile</DialogTitle>
          <DialogDescription>
            Update the name and username for this staff member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">{t('auth.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">{t('auth.lastName')}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">{t('admin.username')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
