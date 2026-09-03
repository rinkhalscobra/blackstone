import { useCallback, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AddTimelineEventDialog from './AddTimelineEventDialog';
import { format } from 'date-fns';
import { 
  Clock, Plus, FileText, Search, DollarSign, 
  CheckCircle, AlertCircle, MessageSquare, User, 
  Loader2, Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
}

interface CaseTimelineEditorProps {
  customerId: string;
  caseNumber?: string | null;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'case_opened':
      return <FileText className="h-3 w-3" />;
    case 'investigation_started':
      return <Search className="h-3 w-3" />;
    case 'funds_recovered':
    case 'balance_adjustment':
      return <DollarSign className="h-3 w-3" />;
    case 'case_closed':
      return <CheckCircle className="h-3 w-3" />;
    case 'document_submitted':
      return <FileText className="h-3 w-3" />;
    case 'contact':
      return <User className="h-3 w-3" />;
    case 'note':
      return <MessageSquare className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'case_opened':
      return 'bg-white/10 text-neutral-300 border-white/20';
    case 'investigation_started':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'funds_recovered':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'case_closed':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'balance_adjustment':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const CaseTimelineEditor = ({ customerId, caseNumber }: CaseTimelineEditorProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('case_timeline')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Unable to load timeline events.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId, t, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('case_timeline')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast({ title: t('dialogs.eventDeleted') });
      fetchEvents();
    } catch (error: unknown) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Unable to delete this timeline event.',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden bg-card border-border">
      <CardHeader className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t('dialogs.caseTimeline')}
          </CardTitle>
          {caseNumber && (
            <p className="text-xs text-muted-foreground mt-1">Case #{caseNumber}</p>
          )}
        </div>
        <AddTimelineEventDialog customerId={customerId} onSuccess={fetchEvents}>
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> {t('dialogs.addEvent')}
          </Button>
        </AddTimelineEventDialog>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dialogs.noTimelineEvents')}</p>
            <AddTimelineEventDialog customerId={customerId} onSuccess={fetchEvents}>
              <Button size="sm" variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> {t('dialogs.addFirstEvent')}
              </Button>
            </AddTimelineEventDialog>
          </div>
        ) : (
          <div className="max-h-[500px] space-y-4 overflow-x-hidden overflow-y-auto pl-3 sm:pr-2">
            {events.map((event, index) => (
              <div 
                key={event.id} 
                className="relative min-w-0 border-l-2 border-border pb-4 pl-5 last:border-l-transparent sm:pl-8"
              >
                {/* Timeline dot */}
                <div className={`absolute -left-[11px] top-0 h-5 w-5 rounded-full border-2 ${getEventColor(event.event_type)}`}>
                  <div className="w-full h-full flex items-center justify-center">
                    {getEventIcon(event.event_type)}
                  </div>
                </div>
                
                <div className="group ml-1 min-w-0 rounded-lg bg-secondary/30 p-3 transition-colors hover:bg-secondary/50 sm:ml-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge variant="outline" className={`max-w-full whitespace-normal break-words text-xs ${getEventColor(event.event_type)}`}>
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="break-words text-sm font-medium">{event.title}</p>
                      {event.description && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 shrink-0 text-destructive opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('dialogs.deleteEvent')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('dialogs.deleteEventConfirm')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(event.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CaseTimelineEditor;
