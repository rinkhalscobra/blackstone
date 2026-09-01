import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useCustomerData } from '@/hooks/useCustomerData';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Info className="h-5 w-5 text-primary" />;
  }
};

const NotificationsPage = () => {
  const { notifications, isLoading, markNotificationRead } = useCustomerData();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('notifications.title')}</h1>
            <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                unreadNotifications.forEach(n => markNotificationRead(n.id));
              }}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
              <p className="text-sm text-muted-foreground">
                {t('notifications.noNotificationsDescription')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Unread */}
            {unreadNotifications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t('notifications.unread')} ({unreadNotifications.length})
                </h2>
                {unreadNotifications.map((notification) => (
                  <Card 
                    key={notification.id}
                    className="border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex gap-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">
                              {notification.title}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Read */}
            {readNotifications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t('notifications.earlier')}
                </h2>
                {readNotifications.map((notification) => (
                  <Card key={notification.id} className="opacity-70">
                    <CardContent className="py-4">
                      <div className="flex gap-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">
                              {notification.title}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
