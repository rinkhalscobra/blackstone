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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Agent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string | null;
}

interface Supervisor {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface BulkAssignAgentsDialogProps {
  agents: Agent[];
  supervisors: Supervisor[];
  onSuccess: () => void;
}

export function BulkAssignAgentsDialog({
  agents,
  supervisors,
  onSuccess,
}: BulkAssignAgentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === agents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map(a => a.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedAgents.length === 0) {
      toast({
        title: t('common.error'),
        description: t('groupAdmin.selectAtLeastOneAgent'),
        variant: 'destructive',
      });
      return;
    }

    if (!selectedSupervisor) {
      toast({
        title: t('common.error'),
        description: t('groupAdmin.selectASupervisor'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Update assigned_to for all selected agents
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_to: selectedSupervisor })
        .in('id', selectedAgents);

      if (error) throw error;

      const supervisor = supervisors.find(s => s.id === selectedSupervisor);
      const supervisorName = supervisor 
        ? `${supervisor.first_name || ''} ${supervisor.last_name || ''}`.trim() || supervisor.email
        : 'Supervisor';

      toast({
        title: t('common.success'),
        description: `${selectedAgents.length} ${t('groupAdmin.agentsAssigned')} ${supervisorName}`,
      });
      
      setOpen(false);
      setSelectedAgents([]);
      setSelectedSupervisor('');
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
    if (!newOpen) {
      setSelectedAgents([]);
      setSelectedSupervisor('');
    }
  };

  const getAgentDisplayName = (agent: Agent) => {
    if (agent.first_name || agent.last_name) {
      return `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
    }
    return agent.username || agent.email || 'Unknown';
  };

  const getSupervisorDisplayName = (supervisor: Supervisor) => {
    if (supervisor.first_name || supervisor.last_name) {
      return `${supervisor.first_name || ''} ${supervisor.last_name || ''}`.trim();
    }
    return supervisor.email || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Users className="h-4 w-4 mr-2" />
          {t('groupAdmin.bulkAssign')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('groupAdmin.bulkAssignTitle')}</DialogTitle>
          <DialogDescription>
            {t('groupAdmin.bulkAssignDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Supervisor Selection */}
          <div className="space-y-2">
            <Label>{t('groupAdmin.selectSupervisor')}</Label>
            <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
              <SelectTrigger>
                <SelectValue placeholder={t('groupAdmin.chooseSupervisor')} />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map(supervisor => (
                  <SelectItem key={supervisor.id} value={supervisor.id}>
                    {getSupervisorDisplayName(supervisor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supervisors.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('groupAdmin.noSupervisorsAvailable')}</p>
            )}
          </div>

          {/* Agent Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('groupAdmin.selectAgents')} ({selectedAgents.length} {t('groupAdmin.selected')})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedAgents.length === agents.length ? t('groupAdmin.deselectAll') : t('groupAdmin.selectAll')}
              </Button>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('groupAdmin.noAgentsAvailable')}</p>
              ) : (
                <div className="space-y-2">
                  {agents.map(agent => (
                    <div
                      key={agent.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAgentToggle(agent.id)}
                    >
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={() => handleAgentToggle(agent.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getAgentDisplayName(agent)}
                        </p>
                        {agent.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {agent.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedAgents.length === 0 || !selectedSupervisor}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('groupAdmin.assign')} {selectedAgents.length > 0 ? `(${selectedAgents.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
