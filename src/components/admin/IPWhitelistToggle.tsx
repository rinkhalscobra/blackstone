import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function IPWhitelistToggle() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('ip_whitelist_settings')
        .select('enabled')
        .eq('id', 'global')
        .single();
      if (error) throw error;
      setEnabled(data.enabled);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSettings(); }, []);

  const toggleWhitelist = async (nextEnabled: boolean) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('ip_whitelist_settings')
        .update({ enabled: nextEnabled })
        .eq('id', 'global')
        .select('enabled')
        .single();
      if (error) throw error;
      setEnabled(data.enabled);
      toast({ title: t(data.enabled ? 'admin.ipWhitelistEnabled' : 'admin.ipWhitelistDisabled') });
    } catch {
      toast({ title: t('common.error'), description: t('admin.ipWhitelistSaveError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="space-y-1">
        <Label htmlFor="ip-whitelist-enabled" className="text-sm font-medium">
          {t('admin.enforceIPWhitelist')}
        </Label>
        <p id="ip-whitelist-description" className="text-sm text-muted-foreground" aria-live="polite">
          {t(loadError ? 'admin.ipWhitelistLoadError' : loading ? 'common.loading' : enabled ? 'admin.ipWhitelistOnDescription' : 'admin.ipWhitelistOffDescription')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {loadError ? (
          <Button variant="outline" size="sm" onClick={() => void loadSettings()}>{t('admin.retryIPWhitelist')}</Button>
        ) : enabled !== null && !loading ? (
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {t(enabled ? 'admin.ipWhitelistOn' : 'admin.ipWhitelistOff')}
          </Badge>
        ) : null}
        <Switch
          id="ip-whitelist-enabled"
          checked={enabled === true}
          disabled={loading || saving || loadError}
          onCheckedChange={toggleWhitelist}
          aria-describedby="ip-whitelist-description"
          aria-busy={loading || saving}
        />
      </div>
    </div>
  );
}
