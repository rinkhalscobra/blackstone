import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Loader2, CheckCircle2, XCircle, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  return error instanceof Error ? error.message : 'Failed to create user';
};

interface Group {
  id: string;
  name: string;
}

interface BulkCreateUsersDialogProps {
  groups: Group[];
  onSuccess: () => void;
}

interface CreateResult {
  email: string;
  success: boolean;
  error?: string;
  password?: string;
}

const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Cameron', 'Dakota', 'Drew', 'Emery', 'Finley', 'Harper', 'Hayden', 'Jamie', 'Kendall', 'Logan', 'Peyton', 'Reese'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];

export const BulkCreateUsersDialog = ({ groups, onSuccess }: BulkCreateUsersDialogProps) => {
  const [open, setOpen] = useState(false);
  const [roleType, setRoleType] = useState<'supervisor' | 'agent' | 'user'>('user');
  const [groupId, setGroupId] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CreateResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const specials = '!@#$%&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += specials.charAt(Math.floor(Math.random() * specials.length));
    password += Math.floor(Math.random() * 10);
    return password;
  };

  const generateDemoUsers = (num: number) => {
    const users = [];
    const timestamp = Date.now();
    for (let i = 0; i < num; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      users.push({
        email: `demo_${roleType}_${timestamp}_${i + 1}@example.com`,
        firstName,
        lastName,
        password: generatePassword()
      });
    }
    return users;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || count < 1) return;

    const usersToCreate = generateDemoUsers(count);
    
    setLoading(true);
    setResults([]);
    const createResults: CreateResult[] = [];

    for (const userData of usersToCreate) {
      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: roleType,
            groupId: groupId,
            createdBy: user?.id
          }
        });

        if (error) throw new Error(await getFunctionErrorMessage(error));
        if (data?.error) throw new Error(data.error);

        createResults.push({
          email: userData.email,
          success: true,
          password: userData.password
        });
      } catch (error: unknown) {
        createResults.push({
          email: userData.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults(createResults);
    setShowResults(true);
    setLoading(false);

    const successCount = createResults.filter(r => r.success).length;
    const failCount = createResults.filter(r => !r.success).length;

    toast({
      title: t('dialogs.bulkComplete'),
      description: `${successCount} ${t('dialogs.demoUsersCreated')}${failCount > 0 ? `, ${failCount} ${t('dialogs.failed')}` : ''}.`
    });

    if (successCount > 0) {
      onSuccess();
    }
  };

  const downloadResults = () => {
    const successfulUsers = results.filter(r => r.success);
    if (successfulUsers.length === 0) return;

    const csvContent = "Email,Password\n" + 
      successfulUsers.map(u => `${u.email},${u.password}`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-users-${roleType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setCount(5);
    setResults([]);
    setShowResults(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Users className="h-4 w-4" /> {t('dialogs.bulkCreate')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('dialogs.bulkCreateTitle')}</DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('dialogs.numberOfUsers')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.roleType')}</Label>
                <Select value={roleType} onValueChange={(v: 'supervisor' | 'agent' | 'user') => setRoleType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.customers')}</SelectItem>
                    <SelectItem value="agent">{t('admin.agents')}</SelectItem>
                    <SelectItem value="supervisor">{t('admin.supervisors')}</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            <p className="text-sm text-muted-foreground">
              {t('dialogs.autoGenerated')}
            </p>

            <Button type="submit" disabled={loading || !groupId || count < 1} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('dialogs.creating')} {count} {t('dialogs.demoUsers')}
                </>
              ) : (
                <>{t('dialogs.createDemoUsers').replace('Demo Users', `${count} Demo Users`)}</>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-success">{results.filter(r => r.success).length} {t('dialogs.successful')}</span>
                {results.filter(r => !r.success).length > 0 && (
                  <span className="text-destructive ml-2">{results.filter(r => !r.success).length} {t('dialogs.failed')}</span>
                )}
              </div>
              {results.filter(r => r.success).length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadResults} className="gap-2">
                  <Download className="h-4 w-4" /> {t('dialogs.downloadCredentials')}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px] rounded-md border border-border p-2">
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      result.success ? 'bg-success/10' : 'bg-destructive/10'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="truncate flex-1">{result.email}</span>
                    {result.success && result.password && (
                      <code className="text-xs bg-secondary px-2 py-0.5 rounded">{result.password}</code>
                    )}
                    {!result.success && result.error && (
                      <span className="text-xs text-destructive truncate max-w-[200px]">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                {t('dialogs.createMore')}
              </Button>
              <Button onClick={() => setOpen(false)} className="flex-1">
                {t('common.done')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
