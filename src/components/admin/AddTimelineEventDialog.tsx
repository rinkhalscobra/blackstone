import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Clock } from 'lucide-react';

interface AddTimelineEventDialogProps {
  customerId: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

const AddTimelineEventDialog = ({ 
  customerId, 
  onSuccess, 
  children 
}: AddTimelineEventDialogProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState('update');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const eventTypes = [
    { value: 'case_opened', label: t('dialogs.eventTypes.caseOpened') },
    { value: 'document_submitted', label: t('dialogs.eventTypes.documentSubmitted') },
    { value: 'investigation_started', label: t('dialogs.eventTypes.investigationStarted') },
    { value: 'recovery_initiated', label: t('dialogs.eventTypes.recoveryInitiated') },
    { value: 'funds_recovered', label: t('dialogs.eventTypes.fundsRecovered') },
    { value: 'case_closed', label: t('dialogs.eventTypes.caseClosed') },
    { value: 'update', label: t('dialogs.eventTypes.update') },
    { value: 'balance_adjustment', label: t('dialogs.eventTypes.balanceAdjustment') },
    { value: 'note', label: t('dialogs.eventTypes.noteAdded') },
    { value: 'contact', label: t('dialogs.eventTypes.customerContact') }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({ title: t('dialogs.titleRequired'), variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('case_timeline')
        .insert({
          customer_id: customerId,
          event_type: eventType,
          title: title.trim(),
          description: description.trim() || null
        });

      if (error) throw error;

      toast({ title: t('dialogs.eventAdded') });
      setOpen(false);
      setTitle('');
      setDescription('');
      setEventType('update');
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
        {children}
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('dialogs.addTimelineEvent')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="eventType">{t('dialogs.eventType')}</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">{t('dialogs.eventTitle')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dialogs.enterEventTitle')}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">{t('dialogs.eventDescription')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('dialogs.enterEventDescription')}
              className="mt-1 min-h-[100px]"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('dialogs.addEvent')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTimelineEventDialog;
