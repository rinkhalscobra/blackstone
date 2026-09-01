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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus } from 'lucide-react';

const getFunctionErrorMessage = async (error: unknown) => {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context;
    if (context?.json) {
      try {
        const body = await context.json();
        if (body?.error) return body.error;
      } catch {
        // Ignore JSON parse failures and fall back to the SDK error message.
      }
    }
  }

  return error instanceof Error ? error.message : 'Failed to create client';
};

interface Group {
  id: string;
  name: string;
}

interface CreateClientDialogProps {
  groups?: Group[];
  defaultGroupId?: string | null;
  defaultAssignedTo?: string | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export const CreateClientDialog = ({
  groups = [],
  defaultGroupId,
  defaultAssignedTo,
  onSuccess,
  children,
}: CreateClientDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    caseNumber: '',
    groupId: defaultGroupId || '',
    assignedTo: defaultAssignedTo || '',
  });

  const generateCaseNumber = () => {
    const prefix = 'CX';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const groupId = formData.groupId || defaultGroupId;
      const assignedTo = formData.assignedTo || defaultAssignedTo || user?.id;
      
      if (!groupId) {
        throw new Error('Please select a group');
      }

      const caseNumber = formData.caseNumber || generateCaseNumber();

      // Call the create-user edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'user',
          groupId,
          createdBy: user?.id,
          assignedTo: assignedTo,
        },
      });

      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (data?.error) {
        if (data.code === 'email_exists' || data.error.includes('already been registered') || data.error.includes('email_exists')) {
          toast({
            title: t('admin.emailExists') || 'Email Already Registered',
            description: t('admin.emailExistsDesc') || 'A user with this email address already exists. Please use a different email or delete the existing account first.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      // Update the profile with additional fields
      if (data?.userId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            phone: formData.phone || null,
            case_number: caseNumber,
            assigned_to: assignedTo,
            platform: data.platform,
          })
          .eq('id', data.userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }

        // Create initial balance record
        await supabase
          .from('customer_balances')
          .insert({
            customer_id: data.userId,
            balance: 0,
            currency: 'EUR',
            updated_by: user?.id,
          });
      }

      toast({
        title: t('admin.clientCreated') || 'Client created',
        description: `${formData.firstName} ${formData.lastName} has been created successfully.`,
      });

      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        caseNumber: '',
        groupId: defaultGroupId || '',
        assignedTo: defaultAssignedTo || '',
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="shrink-0 whitespace-nowrap">
            <UserPlus className="h-4 w-4 mr-2" />
            {t('admin.createClient')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('admin.createClient') || 'Create New Client'}</DialogTitle>
          <DialogDescription>
            {t('admin.createClientDesc') || 'Create a new client account. They will receive login credentials.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('admin.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseNumber">{t('admin.caseNumber')}</Label>
              <div className="flex gap-2">
                <Input
                  id="caseNumber"
                  value={formData.caseNumber}
                  onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ ...formData, caseNumber: generateCaseNumber() })}
                >
                  Generate
                </Button>
              </div>
            </div>

            {groups.length > 0 && !defaultGroupId && (
              <div className="space-y-2">
                <Label htmlFor="groupId">{t('admin.group')}</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectGroup') || 'Select group'} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.creating') || 'Creating...'}
                </>
              ) : (
                t('admin.createClient') || 'Create Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClientDialog;
