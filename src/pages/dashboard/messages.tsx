import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useCustomerData } from '@/hooks/useCustomerData';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const MessagesPage = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useCustomerData();
  const { t } = useLanguage();
  const [conversationRecipientId, setConversationRecipientId] = useState<string | null>(null);
  const [isResolvingConversation, setIsResolvingConversation] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setConversationRecipientId(null);
      setIsResolvingConversation(false);
      return;
    }

    let active = true;
    setIsResolvingConversation(true);

    const resolveRecipient = async () => {
      // CRM messages use the customer's ID as the conversation ID. The latest
      // staff sender is the correct reply target even when assigned_to is empty.
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('conversation_id', user.id)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) console.error('Error resolving conversation contact:', error);
      setConversationRecipientId(data?.sender_id || profile?.assigned_to || null);
      setIsResolvingConversation(false);
    };

    void resolveRecipient();

    const channel = supabase
      .channel(`client-conversation-contact-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${user.id}`,
        },
        (payload) => {
          const message = payload.new as { sender_id: string; recipient_id: string };
          if (message.sender_id !== user.id && message.recipient_id === user.id) {
            setConversationRecipientId(message.sender_id);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.assigned_to]);

  if (isLoading || isResolvingConversation) {
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
  const recipientId = conversationRecipientId || profile?.assigned_to || '';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('messages.title')}</h1>
          <p className="text-muted-foreground">
            {t('messages.subtitle')}
          </p>
        </div>

        {!recipientId ? (
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
            recipientId={recipientId}
            recipientName={t('messages.caseSpecialist')}
            className="h-[calc(100vh-240px)] min-h-[500px]"
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MessagesPage;
