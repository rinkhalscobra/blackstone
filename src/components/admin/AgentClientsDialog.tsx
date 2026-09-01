import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface AssignedClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  case_number: string | null;
  case_phase: string | null;
  status: string | null;
  created_at: string | null;
}

interface AgentClientsDialogProps {
  agentId: string;
  agentName: string;
  /** Optional pre-computed count shown on the trigger button */
  count?: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  invalid_language: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const AgentClientsDialog = ({ agentId, agentName, count }: AgentClientsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<AssignedClient[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, case_number, case_phase, status, created_at')
        .eq('assigned_to', agentId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data || []) as AssignedClient[]);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 px-2 gap-1">
          <Users className="h-4 w-4" />
          {typeof count === 'number' && <span className="text-xs">{count}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('admin.assignedClients')}</DialogTitle>
          <DialogDescription>{agentName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : clients.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t('admin.noAssignedClients')}</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>{t('admin.fullName')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('common.email')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('admin.caseNumber')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id} className="border-border">
                    <TableCell className="font-medium">
                      {`${c.first_name || ''} ${c.last_name || ''}`.trim() || 'N/A'}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{c.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.case_number || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[c.status || 'active']} border`}>
                        {(c.status || 'active').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => {
                          setOpen(false);
                          navigate(`/customer/${c.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AgentClientsDialog;
