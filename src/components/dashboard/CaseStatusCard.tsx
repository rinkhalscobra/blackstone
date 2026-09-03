import { FileText, CheckCircle, Clock, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { RecoveryInvestigationPanel, type RecoveryInvestigationData } from './RecoveryInvestigationPanel';

interface CaseStatusCardProps extends RecoveryInvestigationData {
  caseNumber: string | null;
  status: string | null;
  casePhase?: string | null;
}

const getStageIndex = (casePhase: string | null): number => {
  if (!casePhase) return 0;
  const phaseMap: Record<string, number> = {
    submitted: 0,
    bank_verification: 1,
    exchange_commission: 1,
    investigation: 1,
    recovery: 1,
    review: 1,
    completed: 2,
  };
  return phaseMap[casePhase] ?? 0;
};

export const CaseStatusCard = ({
  caseNumber,
  status,
  casePhase,
  searchStartedAt,
  searchDurationMinutes,
  searchScope,
  resultType,
  resultDetails,
  completedAt,
}: CaseStatusCardProps) => {
  const { t } = useLanguage();
  const currentStage = getStageIndex(casePhase);
  
  const stages = [
    { id: 'submitted', label: t('caseStatus.caseFiled'), icon: FileText, description: t('caseStatus.caseSubmitted') },
    { id: 'review', label: t('caseStatus.underReview'), icon: Search, description: t('caseStatus.reviewingDocs') },
    { id: 'completed', label: t('caseStatus.completed'), icon: CheckCircle, description: t('caseStatus.fundsRecovered') },
  ];

  const getStatusMessage = (status: string | null, stageIndex: number): string => {
    if (status === 'suspended') return t('caseStatus.requiresAttention');
    if (stageIndex >= stages.length - 1) return t('caseStatus.congratulations');
    return stages[stageIndex]?.description || t('caseStatus.processingCase');
  };

  const progressPercent = Math.max(0, Math.min(100, ((currentStage + 1) / stages.length) * 100));

  return (
    <Card className="h-full min-w-0 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <CardTitle className="text-lg font-semibold text-foreground">
              {t('caseStatus.caseProgress')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusMessage(status, currentStage)}
            </p>
          </div>
          {status === 'suspended' ? (
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          ) : currentStage >= stages.length - 1 ? (
            <div className="p-2 rounded-full bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          ) : (
            <div className="p-2 rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary animate-pulse" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Case number badge */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{t('caseStatus.yourCaseNumber')}</div>
            <div className="font-mono font-bold text-foreground text-base sm:text-lg break-words">
              {caseNumber || t('caseStatus.pendingAssignment')}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('caseStatus.overallProgress')}</span>
            <span className="font-medium text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Progress Steps */}
        <div className="relative pt-2">
          {/* Connection line */}
          <div className="absolute top-[26px] left-[16.67%] right-[16.67%] h-1 bg-muted rounded-full" />
          <div 
            className="absolute top-[26px] left-[16.67%] h-1 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(0, (currentStage / (stages.length - 1)) * 66.66)}%` }}
          />
          
          <div className="relative grid grid-cols-3 gap-1">
            {stages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isCompleted = index < currentStage;
              const isCurrent = index === currentStage;
              const isPending = index > currentStage;

              return (
                <div 
                  key={stage.id} 
                  className="min-w-0 flex flex-col items-center relative group"
                >
                  {/* Tooltip on hover */}
                  <div className={cn(
                    "absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10",
                    "bg-popover text-popover-foreground shadow-lg border border-border"
                  )}>
                    {stage.description}
                  </div>
                  
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10",
                    isCompleted 
                      ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30" 
                      : isCurrent 
                        ? "bg-card border-primary text-primary ring-4 ring-primary/20 shadow-lg" 
                        : "bg-card border-muted text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StageIcon className={cn("h-4 w-4", isCurrent && "animate-pulse")} />
                    )}
                  </div>
                  <span className={cn(
                    "hidden sm:block w-full px-1 text-[10px] lg:text-xs mt-2 text-center leading-tight transition-colors truncate",
                    isCurrent 
                      ? "text-primary font-semibold" 
                      : isCompleted 
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                  )}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <RecoveryInvestigationPanel
          phase={casePhase}
          searchStartedAt={searchStartedAt}
          searchDurationMinutes={searchDurationMinutes}
          searchScope={searchScope}
          resultType={resultType}
          resultDetails={resultDetails}
          completedAt={completedAt}
        />
      </CardContent>
    </Card>
  );
};
