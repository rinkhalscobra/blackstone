import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Loader2, FileText } from 'lucide-react';

interface CreateNotificationDialogProps {
  userId: string;
  userName?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
}

interface NotificationTemplate {
  id: string;
  type: string;
  titleKey: string;
  messageKey: string;
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: 'case_update', type: 'info', titleKey: 'notification.templates.case_update.title', messageKey: 'notification.templates.case_update.message' },
  { id: 'action_required', type: 'warning', titleKey: 'notification.templates.action_required.title', messageKey: 'notification.templates.action_required.message' },
  { id: 'document_needed', type: 'warning', titleKey: 'notification.templates.document_needed.title', messageKey: 'notification.templates.document_needed.message' },
  { id: 'payment_received', type: 'success', titleKey: 'notification.templates.payment_received.title', messageKey: 'notification.templates.payment_received.message' },
  { id: 'case_resolved', type: 'success', titleKey: 'notification.templates.case_resolved.title', messageKey: 'notification.templates.case_resolved.message' },
  { id: 'verification_required', type: 'error', titleKey: 'notification.templates.verification_required.title', messageKey: 'notification.templates.verification_required.message' },
];

const CreateNotificationDialog = ({ 
  userId, 
  userName = 'User',
  children,
  onSuccess 
}: CreateNotificationDialogProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      setType('info');
      setTitle('');
      setMessage('');
      return;
    }
    
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setType(template.type);
      setTitle(t(template.titleKey));
      setMessage(t(template.messageKey));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title: title.trim(),
        message: message.trim() || null,
        is_read: false,
      });

      if (error) throw error;

      toast({ 
        title: t('notification.sent'),
        description: t('notification.sentTo').replace('{name}', userName),
      });
      
      setTitle('');
      setMessage('');
      setType('info');
      setSelectedTemplate('');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ 
        title: t('common.error'), 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = [
    { value: 'info', label: t('notification.typeInfo'), color: 'text-neutral-300' },
    { value: 'success', label: t('notification.typeSuccess'), color: 'text-green-400' },
    { value: 'warning', label: t('notification.typeWarning'), color: 'text-yellow-400' },
    { value: 'error', label: t('notification.typeError'), color: 'text-red-400' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" variant="outline">
            <Bell className="h-4 w-4 mr-1" /> {t('notification.send')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notification.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('notification.createDescription').replace('{name}', userName)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="template" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('notification.templateLabel')}
              </Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template">
                  <SelectValue placeholder={t('notification.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t('notification.customNotification')}</SelectItem>
                  {NOTIFICATION_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {t(`notification.templates.${template.id}.name`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">{t('notification.type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">{t('notification.titleLabel')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('notification.titlePlaceholder')}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">{t('notification.messageLabel')}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('notification.messagePlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('notification.send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNotificationDialog;
