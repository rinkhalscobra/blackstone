import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Shield, 
  Search, 
  AlertCircle,
  DollarSign,
  Sparkles,
  TrendingUp,
  MessageCircle,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
  caseNumber: string | null;
}

const getEventIcon = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'case_opened':
    case 'submitted':
      return FileText;
    case 'document_submitted':
    case 'document':
      return FileCheck;
    case 'review':
      return Search;
    case 'investigation':
    case 'investigation_started':
      return Shield;
    case 'recovery_initiated':
    case 'recovery':
      return TrendingUp;
    case 'funds_recovered':
    case 'completed':
      return DollarSign;
    case 'case_closed':
      return CheckCircle;
    case 'balance_adjustment':
      return DollarSign;
    case 'update':
    case 'message':
      return MessageCircle;
    case 'alert':
      return AlertCircle;
    default:
      return Clock;
  }
};

const getEventStyle = (eventType: string) => {
  switch (eventType.toLowerCase()) {
    case 'funds_recovered':
    case 'completed':
    case 'case_closed':
      return {
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/30',
        dotColor: 'bg-emerald-500'
      };
    case 'alert':
      return {
        iconBg: 'bg-destructive/20',
        iconColor: 'text-destructive',
        borderColor: 'border-destructive/30',
        dotColor: 'bg-destructive'
      };
    case 'investigation':
    case 'investigation_started':
    case 'recovery_initiated':
      return {
        iconBg: 'bg-primary/20',
        iconColor: 'text-primary',
        borderColor: 'border-primary/30',
        dotColor: 'bg-primary'
      };
    case 'document_submitted':
    case 'document':
      return {
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-500',
        borderColor: 'border-amber-500/30',
        dotColor: 'bg-amber-500'
      };
    default:
      return {
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
        borderColor: 'border-border',
        dotColor: 'bg-muted-foreground'
      };
  }
};

export const CaseTimeline = ({ events, caseNumber }: CaseTimelineProps) => {
  const { t } = useLanguage();
  
  const getFriendlyEventType = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'case_opened':
      case 'submitted':
        return t('caseTimeline.caseOpened');
      case 'document_submitted':
      case 'document':
        return t('caseTimeline.documentReceived');
      case 'review':
        return t('caseStatus.underReview');
      case 'investigation':
      case 'investigation_started':
        return t('caseStatus.investigation');
      case 'recovery_initiated':
        return t('caseTimeline.recoveryStarted');
      case 'funds_recovered':
        return t('caseTimeline.fundsRecovered');
      case 'completed':
      case 'case_closed':
        return t('caseTimeline.caseCompleted');
      case 'balance_adjustment':
        return t('caseTimeline.balanceUpdate');
      case 'update':
      case 'message':
        return t('caseTimeline.update');
      case 'alert':
        return t('caseTimeline.importantNotice');
      default:
        return t('caseTimeline.update');
    }
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestEvent = sortedEvents[0];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('caseTimeline.title')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('caseTimeline.subtitle')}
            </CardDescription>
          </div>
          {caseNumber && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{t('caseTimeline.caseNumber')}</div>
              <div className="font-mono font-semibold text-primary">#{caseNumber}</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('caseTimeline.journeyBegins')}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t('caseTimeline.onceReviewed')}
            </p>
          </div>
        ) : (
          <>
            {/* Latest Update Highlight */}
            {latestEvent && (
              <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = getEventIcon(latestEvent.event_type);
                      return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary uppercase tracking-wide">
                        {t('caseTimeline.latestUpdate')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(latestEvent.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground">{latestEvent.title}</h4>
                    {latestEvent.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {latestEvent.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border" />
              
              <div className="space-y-6">
                {sortedEvents.map((event, index) => {
                  const Icon = getEventIcon(event.event_type);
                  const style = getEventStyle(event.event_type);
                  const isFirst = index === 0;

                  return (
                    <div 
                      key={event.id} 
                      className={cn(
                        "relative transition-all duration-300",
                        isFirst && "scale-100" 
                      )}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center",
                        style.iconBg,
                        "ring-4 ring-background"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", style.dotColor)} />
                      </div>
                      
                      {/* Content */}
                      <div className={cn(
                        "group rounded-lg p-4 transition-colors",
                        isFirst ? "bg-card border border-border shadow-sm" : "hover:bg-muted/50"
                      )}>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            style.iconBg
                          )}>
                            <Icon className={cn("h-5 w-5", style.iconColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                style.iconBg,
                                style.iconColor
                              )}>
                                {getFriendlyEventType(event.event_type)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), 'MMM d, yyyy • h:mm a')}
                              </span>
                            </div>
                            <h4 className="font-medium text-foreground">
                              {event.title}
                            </h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Encouraging footer */}
            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{events.length} {t('caseTimeline.updatesOnCase')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('caseTimeline.teamWorking')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
