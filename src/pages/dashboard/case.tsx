import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CaseStatusCard } from '@/components/dashboard/CaseStatusCard';
import { CaseTimeline } from '@/components/dashboard/CaseTimeline';
import { useCustomerData } from '@/hooks/useCustomerData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, Calendar, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CasePage = () => {
  const { profile, timeline, isLoading } = useCustomerData();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 lg:col-span-2" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('case.title')}</h1>
          <p className="text-muted-foreground">{t('case.subtitle')}</p>
        </div>

        {/* Case Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Status - Takes 2 columns */}
          <div className="lg:col-span-2">
            <CaseStatusCard 
              caseNumber={profile?.case_number || null}
              status={profile?.status || null}
              casePhase={profile?.case_phase || null}
              searchStartedAt={profile?.recovery_search_started_at}
              searchDurationMinutes={profile?.recovery_search_duration_minutes}
              searchScope={profile?.recovery_search_scope}
              resultType={profile?.recovery_result_type}
              resultDetails={profile?.recovery_result_details}
              completedAt={profile?.recovery_completed_at}
            />
          </div>

          {/* Contact Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('case.needAssistance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('case.specialistHelp')}
              </p>
              <Button asChild className="w-full">
                <Link to="/contact">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('case.contactSupport')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('case.caseInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('case.fullName')}</div>
                  <div className="font-medium text-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('case.email')}</div>
                  <div className="font-medium text-foreground">
                    {profile?.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('case.phone')}</div>
                  <div className="font-medium text-foreground">
                    {profile?.phone || t('case.notProvided')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('case.memberSince')}</div>
                  <div className="font-medium text-foreground">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Case Timeline */}
        <CaseTimeline 
          events={timeline} 
          caseNumber={profile?.case_number || null} 
        />
      </div>
    </DashboardLayout>
  );
};

export default CasePage;
