import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, UserCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const MessagesPage = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useCustomerData();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px]" />
        </div>
      </DashboardLayout>
    );
  }

  // Use the customer's own ID as conversation ID for simplicity
  // In a real app, you might have a separate conversations table
  const conversationId = user?.id || '';
  const assignedAgentId = profile?.assigned_to || '';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('messages.title')}</h1>
          <p className="text-muted-foreground">
            {t('messages.subtitle')}
          </p>
        </div>

        {!assignedAgentId ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <UserCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('messages.noAgentAssigned')}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {t('messages.noAgentDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ChatWindow
            conversationId={conversationId}
            recipientId={assignedAgentId}
            recipientName={t('messages.caseSpecialist')}
            className="h-[calc(100vh-240px)] min-h-[500px]"
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MessagesPage;
