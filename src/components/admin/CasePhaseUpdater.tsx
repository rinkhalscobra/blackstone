import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Search, Landmark, Building2, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CasePhaseUpdaterProps {
  customerId: string;
  currentPhase: string | null;
  onUpdate: () => void;
}

const phases = [
  { id: 'submitted', icon: FileText },
  { id: 'bank_verification', icon: Landmark },
  { id: 'exchange_commission', icon: Building2 },
  { id: 'review', icon: Search },
  { id: 'completed', icon: CheckCircle },
];

export const CasePhaseUpdater = ({ customerId, currentPhase, onUpdate }: CasePhaseUpdaterProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const currentIndex = phases.findIndex(p => p.id === currentPhase) || 0;

  const handlePhaseClick = (phaseId: string) => {
    if (phaseId === currentPhase) return;
    setSelectedPhase(phaseId);
    setNote('');
    setDialogOpen(true);
  };

  const handleConfirmPhaseUpdate = async () => {
    if (!selectedPhase) return;
    
    setUpdating(true);
    try {
      // Update the case phase
      const { error } = await supabase
        .from('profiles')
        .update({ case_phase: selectedPhase })
        .eq('id', customerId);

      if (error) throw error;

      // Create timeline entry with note
      const phaseLabel = getPhaseLabel(selectedPhase);
      const { error: timelineError } = await supabase
        .from('case_timeline')
        .insert({
          customer_id: customerId,
          event_type: 'phase_change',
          title: `${t('customerDetail.phaseChangedTo')}: ${phaseLabel}`,
          description: note.trim() || null,
          created_by: user?.id || null,
        });

      if (timelineError) {
        console.error('Error creating timeline entry:', timelineError);
      }

      // Create notification for the client
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: customerId,
          type: 'success',
          title: t('notifications.casePhaseUpdated'),
          message: note.trim() 
            ? `${t('notifications.casePhaseMessage')}: ${phaseLabel}\n\n${note.trim()}`
            : `${t('notifications.casePhaseMessage')}: ${phaseLabel}`,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
      
      toast({ title: t('customerDetail.phaseUpdated') });
      setDialogOpen(false);
      setSelectedPhase(null);
      setNote('');
      onUpdate();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const getPhaseLabel = (phaseId: string) => {
    const labels: Record<string, string> = {
      submitted: t('caseStatus.caseFiled'),
      bank_verification: t('caseStatus.bankVerification'),
      exchange_commission: t('caseStatus.exchangeCommission'),
      review: t('caseStatus.underReview'),
      completed: t('caseStatus.completed'),
    };
    return labels[phaseId] || phaseId;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('customerDetail.updateCasePhase')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = phase.id === currentPhase;
              const isCompleted = index < currentIndex;

              return (
                <Button
                  key={phase.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'flex items-center gap-2',
                    isCompleted && !isActive && 'border-primary/50 text-primary'
                  )}
                  onClick={() => handlePhaseClick(phase.id)}
                  disabled={updating || phase.id === currentPhase}
                >
                  <Icon className="h-4 w-4" />
                  {getPhaseLabel(phase.id)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t('customerDetail.confirmPhaseChange')}
            </DialogTitle>
            <DialogDescription>
              {currentPhase && selectedPhase && (
                <span className="flex items-center gap-2 mt-2">
                  <span className="font-medium text-foreground">{getPhaseLabel(currentPhase)}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium text-primary">{getPhaseLabel(selectedPhase)}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phase-note">{t('customerDetail.phaseNote')}</Label>
              <Textarea
                id="phase-note"
                placeholder={t('customerDetail.phaseNotePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('customerDetail.phaseNoteHint')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmPhaseUpdate} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
