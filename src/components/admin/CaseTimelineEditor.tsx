import { useState, useEffect } from 'react';
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
      return <FileText className="h-4 w-4" />;
    case 'investigation_started':
      return <Search className="h-4 w-4" />;
    case 'funds_recovered':
    case 'balance_adjustment':
      return <DollarSign className="h-4 w-4" />;
    case 'case_closed':
      return <CheckCircle className="h-4 w-4" />;
    case 'document_submitted':
      return <FileText className="h-4 w-4" />;
    case 'contact':
      return <User className="h-4 w-4" />;
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'case_opened':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
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

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('case_timeline')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [customerId]);

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('case_timeline')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      toast({ title: t('dialogs.eventDeleted') });
      fetchEvents();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
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
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t('dialogs.caseTimeline')}
          </CardTitle>
          {caseNumber && (
            <p className="text-xs text-muted-foreground mt-1">Case #{caseNumber}</p>
          )}
        </div>
        <AddTimelineEventDialog customerId={customerId} onSuccess={fetchEvents}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> {t('dialogs.addEvent')}
          </Button>
        </AddTimelineEventDialog>
      </CardHeader>
      <CardContent className="p-4">
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
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {events.map((event, index) => (
              <div 
                key={event.id} 
                className="relative pl-8 pb-4 border-l-2 border-border last:border-l-transparent"
              >
                {/* Timeline dot */}
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${getEventColor(event.event_type)}`}>
                  <div className="w-full h-full flex items-center justify-center">
                    {getEventIcon(event.event_type)}
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3 ml-2 group hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${getEventColor(event.event_type)}`}>
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
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
