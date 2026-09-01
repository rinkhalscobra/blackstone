import { ArrowDownRight, ArrowUpRight, MessageSquare, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export const QuickActionsCard = () => {
  const { t } = useLanguage();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('quickActions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/dashboard/deposit">
            <ArrowDownRight className="h-6 w-6 text-success" />
            <span>{t('balance.deposit')}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/dashboard/withdraw">
            <ArrowUpRight className="h-6 w-6 text-destructive" />
            <span>{t('balance.withdraw')}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/dashboard/case">
            <FileText className="h-6 w-6 text-primary" />
            <span>{t('quickActions.myCase')}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/contact">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span>{t('nav.support')}</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
