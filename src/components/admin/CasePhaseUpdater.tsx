import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Bitcoin, CheckCircle, Clock3, FileText, Landmark, Loader2, Play, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CasePhaseUpdaterProps {
  customerId: string;
  currentPhase: string | null;
  searchStartedAt?: string | null;
  searchDurationMinutes?: number | null;
  searchScope?: string | null;
  resultType?: string | null;
  resultDetails?: Json | null;
  onUpdate: () => void;
}

type DurationUnit = 'minutes' | 'hours' | 'days';
type SearchScope = 'bank' | 'crypto' | 'both';
type ResultType = 'bank_transaction' | 'crypto_transaction';
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type DetailRecord = Record<string, string>;

const phases = [
  { id: 'submitted', icon: FileText },
  { id: 'review', icon: Search },
  { id: 'completed', icon: CheckCircle },
];

const normalizePhase = (phase: string | null) => {
  if (['bank_verification', 'exchange_commission', 'investigation', 'recovery'].includes(phase || '')) return 'review';
  return phase || 'submitted';
};

const jsonToDetails = (value: Json | null | undefined): DetailRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [key, fieldValue == null ? '' : String(fieldValue)]));
};

const durationForForm = (minutes: number): { value: string; unit: DurationUnit } => {
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: String(minutes / 1440), unit: 'days' };
  if (minutes >= 60 && minutes % 60 === 0) return { value: String(minutes / 60), unit: 'hours' };
  return { value: String(minutes), unit: 'minutes' };
};

const toMinutes = (value: number, unit: DurationUnit) => {
  if (unit === 'days') return value * 1440;
  if (unit === 'hours') return value * 60;
  return value;
};

export const CasePhaseUpdater = ({
  customerId,
  currentPhase,
  searchStartedAt,
  searchDurationMinutes = 4320,
  searchScope = 'both',
  resultType,
  resultDetails,
  onUpdate,
}: CasePhaseUpdaterProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const initialDuration = durationForForm(searchDurationMinutes || 4320);
  const [duration, setDuration] = useState(initialDuration.value);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(initialDuration.unit);
  const [scope, setScope] = useState<SearchScope>(searchScope === 'bank' || searchScope === 'crypto' ? searchScope : 'both');
  const [findingType, setFindingType] = useState<ResultType>(resultType === 'crypto_transaction' ? 'crypto_transaction' : 'bank_transaction');
  const [findingDetails, setFindingDetails] = useState<DetailRecord>(() => jsonToDetails(resultDetails));

  const normalizedCurrentPhase = normalizePhase(currentPhase);
  const foundIndex = phases.findIndex((phase) => phase.id === normalizedCurrentPhase);
  const currentIndex = foundIndex < 0 ? 0 : foundIndex;
  const configuredEnd = useMemo(() => {
    if (!searchStartedAt) return null;
    return new Date(new Date(searchStartedAt).getTime() + (searchDurationMinutes || 4320) * 60000);
  }, [searchDurationMinutes, searchStartedAt]);

  const getPhaseLabel = (phaseId: string) => {
    const labels: Record<string, string> = {
      submitted: t('caseStatus.caseFiled'),
      review: t('caseStatus.underReview'),
      completed: t('caseStatus.completed'),
    };
    return labels[phaseId] || phaseId;
  };

  const updateFinding = (key: string, value: string) => {
    setFindingDetails((current) => ({ ...current, [key]: value }));
  };

  const openPhaseDialog = (phaseId: string, allowCurrent = false) => {
    if (phaseId === normalizedCurrentPhase && !allowCurrent) return;
    const configuredDuration = durationForForm(searchDurationMinutes || 4320);
    setDuration(configuredDuration.value);
    setDurationUnit(configuredDuration.unit);
    setScope(searchScope === 'bank' || searchScope === 'crypto' ? searchScope : 'both');
    setFindingType(resultType === 'crypto_transaction' ? 'crypto_transaction' : 'bank_transaction');
    setFindingDetails(jsonToDetails(resultDetails));
    setSelectedPhase(phaseId);
    setNote('');
    setDialogOpen(true);
  };

  const validate = () => {
    if (selectedPhase === 'review') {
      const numericDuration = Number(duration);
      const minutes = toMinutes(numericDuration, durationUnit);
      if (!Number.isFinite(numericDuration) || numericDuration <= 0 || minutes > 525600) {
        return 'Enter an investigation duration between one minute and one year.';
      }
    }

    if (selectedPhase === 'completed') {
      if (!findingDetails.amount?.trim() || Number(findingDetails.amount) <= 0 || !/^[A-Z]{3}$/.test(findingDetails.currency?.trim().toUpperCase() || '')) {
        return 'Enter the identified amount and a valid three-letter currency code.';
      }
      if (!findingDetails.evidence_reference?.trim()) return 'Enter an internal evidence reference for auditability.';
      if (findingType === 'bank_transaction' && (!findingDetails.bank_name?.trim() || !findingDetails.transaction_reference?.trim())) {
        return 'Enter the bank name and transaction reference.';
      }
      if (findingType === 'crypto_transaction' && (!findingDetails.asset?.trim() || !findingDetails.network?.trim() || !findingDetails.transaction_hash?.trim())) {
        return 'Enter the asset, network, and blockchain transaction hash.';
      }
    }
    return null;
  };

  const handleConfirmPhaseUpdate = async () => {
    if (!selectedPhase) return;
    const validationError = validate();
    if (validationError) {
      toast({ title: 'Complete the workflow details', description: validationError, variant: 'destructive' });
      return;
    }

    setUpdating(true);
    try {
      const update: ProfileUpdate = { case_phase: selectedPhase };
      if (selectedPhase === 'review') {
        update.recovery_search_started_at = new Date().toISOString();
        update.recovery_search_duration_minutes = Math.round(toMinutes(Number(duration), durationUnit));
        update.recovery_search_scope = scope;
        update.recovery_completed_at = null;
      } else if (selectedPhase === 'completed') {
        const commonKeys = ['amount', 'currency', 'evidence_reference', 'summary'];
        const bankKeys = ['bank_name', 'beneficiary_name', 'transaction_reference', 'account_reference', 'transaction_date', 'country'];
        const cryptoKeys = ['asset', 'network', 'wallet_address', 'transaction_hash', 'exchange_name'];
        const allowedKeys = new Set([...commonKeys, ...(findingType === 'bank_transaction' ? bankKeys : cryptoKeys)]);
        const cleanedDetails = Object.fromEntries(
          Object.entries(findingDetails)
            .filter(([key]) => allowedKeys.has(key))
            .map(([key, value]) => [key, value.trim()])
            .filter(([, value]) => value),
        );
        update.recovery_result_type = findingType;
        update.recovery_result_details = cleanedDetails as Json;
        update.recovery_completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('profiles').update(update).eq('id', customerId);
      if (error) throw error;

      const phaseLabel = getPhaseLabel(selectedPhase);
      const timelineDescription = selectedPhase === 'review'
        ? `Investigation scope: ${scope}. Configured duration: ${duration} ${durationUnit}.${note.trim() ? `\n${note.trim()}` : ''}`
        : selectedPhase === 'completed'
          ? `Published ${findingType === 'crypto_transaction' ? 'blockchain' : 'bank'} transaction findings. Evidence reference: ${findingDetails.evidence_reference}.${note.trim() ? `\n${note.trim()}` : ''}`
          : note.trim() || null;

      const [timelineResult, notificationResult] = await Promise.all([
        supabase.from('case_timeline').insert({
          customer_id: customerId,
          event_type: 'phase_change',
          title: `${t('customerDetail.phaseChangedTo')}: ${phaseLabel}`,
          description: timelineDescription,
          created_by: user?.id || null,
        }),
        supabase.from('notifications').insert({
          user_id: customerId,
          type: 'success',
          title: t('notifications.casePhaseUpdated'),
          message: selectedPhase === 'completed'
            ? 'Investigation findings have been published to your case dashboard.'
            : `${t('notifications.casePhaseMessage')}: ${phaseLabel}`,
        }),
      ]);

      if (timelineResult.error) console.error('Error creating timeline entry:', timelineResult.error);
      if (notificationResult.error) console.error('Error creating notification:', notificationResult.error);

      toast({ title: selectedPhase === 'completed' ? 'Recovery findings published' : t('customerDetail.phaseUpdated') });
      setDialogOpen(false);
      setSelectedPhase(null);
      setNote('');
      onUpdate();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Unable to update the recovery workflow.', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-medium">{t('customerDetail.updateCasePhase')}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Manage the client-visible recovery investigation.</p>
            </div>
            {normalizedCurrentPhase === 'review' && (
              <Button size="sm" onClick={() => openPhaseDialog('completed')} className="w-full sm:w-auto">
                <Play className="mr-2 h-4 w-4" /> Show results now
              </Button>
            )}
            {normalizedCurrentPhase === 'completed' && (
              <Button size="sm" variant="outline" onClick={() => openPhaseDialog('completed', true)} className="w-full sm:w-auto">
                Edit published results
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              const isActive = phase.id === normalizedCurrentPhase;
              const isCompleted = index < currentIndex;
              return (
                <Button key={phase.id} variant={isActive ? 'default' : 'outline'} size="sm" className={cn('flex items-center gap-2', isCompleted && !isActive && 'border-primary/50 text-primary')} onClick={() => openPhaseDialog(phase.id)} disabled={updating || isActive}>
                  <Icon className="h-4 w-4" /> {getPhaseLabel(phase.id)}
                </Button>
              );
            })}
          </div>

          {normalizedCurrentPhase === 'review' && (
            <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Search window active · {searchScope === 'both' ? 'Bank + crypto' : searchScope}</p>
                  <p className="text-muted-foreground">{configuredEnd ? `Configured to run until ${configuredEnd.toLocaleString()}` : `${searchDurationMinutes} minutes configured`}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openPhaseDialog('review', true)}>Restart / edit search</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPhase === 'review' ? 'Configure recovery search' : selectedPhase === 'completed' ? 'Publish investigation findings' : 'Return case to filed'}</DialogTitle>
            <DialogDescription>
              {selectedPhase === 'review' && 'Choose what the client sees and how long the investigation animation remains active.'}
              {selectedPhase === 'completed' && 'Record the evidence-backed transaction finding that will be shown on the client dashboard.'}
              {selectedPhase === 'submitted' && 'This clears the current search state and any published result from the client dashboard.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {selectedPhase === 'review' && (
              <>
                <div className="space-y-2">
                  <Label>Search channels</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ['both', 'Bank + crypto', Search],
                      ['bank', 'Bank transactions', Landmark],
                      ['crypto', 'Crypto transactions', Bitcoin],
                    ] as const).map(([value, label, Icon]) => (
                      <button key={value} type="button" onClick={() => setScope(value)} className={cn('rounded-lg border p-3 text-left transition-colors', scope === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
                        <Icon className="mb-2 h-5 w-5" /><span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search-duration">Client-visible search duration</Label>
                  <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
                    <Input id="search-duration" type="number" min="1" step="1" value={duration} onChange={(event) => setDuration(event.target.value)} />
                    <Select value={durationUnit} onValueChange={(value) => setDurationUnit(value as DurationUnit)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="minutes">Minutes</SelectItem><SelectItem value="hours">Hours</SelectItem><SelectItem value="days">Days</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">The search starts when you confirm. You can restart it or publish results immediately at any time.</p>
                </div>
              </>
            )}

            {selectedPhase === 'completed' && (
              <>
                <div className="space-y-2">
                  <Label>Where the transaction was identified</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setFindingType('bank_transaction')} className={cn('rounded-lg border p-4 text-left', findingType === 'bank_transaction' ? 'border-primary bg-primary/10' : 'border-border')}><Landmark className="mb-2 h-5 w-5" /><span className="font-medium">Bank transaction</span></button>
                    <button type="button" onClick={() => setFindingType('crypto_transaction')} className={cn('rounded-lg border p-4 text-left', findingType === 'crypto_transaction' ? 'border-primary bg-primary/10' : 'border-border')}><Bitcoin className="mb-2 h-5 w-5" /><span className="font-medium">Crypto transaction</span></button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="finding-amount">Identified amount</Label><Input id="finding-amount" type="number" min="0.01" step="0.01" value={findingDetails.amount || ''} onChange={(event) => updateFinding('amount', event.target.value)} placeholder="0.00" /></div>
                  <div className="space-y-2"><Label htmlFor="finding-currency">Currency</Label><Input id="finding-currency" value={findingDetails.currency || ''} onChange={(event) => updateFinding('currency', event.target.value.toUpperCase())} placeholder={findingType === 'crypto_transaction' ? 'USD' : 'EUR'} maxLength={8} /></div>

                  {findingType === 'bank_transaction' ? (
                    <>
                      <div className="space-y-2"><Label htmlFor="bank-name">Financial institution</Label><Input id="bank-name" value={findingDetails.bank_name || ''} onChange={(event) => updateFinding('bank_name', event.target.value)} placeholder="Bank name" /></div>
                      <div className="space-y-2"><Label htmlFor="beneficiary">Beneficiary</Label><Input id="beneficiary" value={findingDetails.beneficiary_name || ''} onChange={(event) => updateFinding('beneficiary_name', event.target.value)} placeholder="Account beneficiary" /></div>
                      <div className="space-y-2"><Label htmlFor="bank-reference">Transaction reference</Label><Input id="bank-reference" value={findingDetails.transaction_reference || ''} onChange={(event) => updateFinding('transaction_reference', event.target.value)} placeholder="Wire / transfer reference" /></div>
                      <div className="space-y-2"><Label htmlFor="account-reference">Account reference</Label><Input id="account-reference" value={findingDetails.account_reference || ''} onChange={(event) => updateFinding('account_reference', event.target.value)} placeholder="Masked account or IBAN" /></div>
                      <div className="space-y-2"><Label htmlFor="bank-date">Transaction date</Label><Input id="bank-date" type="date" value={findingDetails.transaction_date || ''} onChange={(event) => updateFinding('transaction_date', event.target.value)} /></div>
                      <div className="space-y-2"><Label htmlFor="bank-country">Jurisdiction</Label><Input id="bank-country" value={findingDetails.country || ''} onChange={(event) => updateFinding('country', event.target.value)} placeholder="Country" /></div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2"><Label htmlFor="crypto-asset">Asset</Label><Input id="crypto-asset" value={findingDetails.asset || ''} onChange={(event) => updateFinding('asset', event.target.value.toUpperCase())} placeholder="USDT" /></div>
                      <div className="space-y-2"><Label htmlFor="crypto-network">Network</Label><Input id="crypto-network" value={findingDetails.network || ''} onChange={(event) => updateFinding('network', event.target.value)} placeholder="TRC-20" /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="wallet-address">Attributed wallet</Label><Input id="wallet-address" className="font-mono" value={findingDetails.wallet_address || ''} onChange={(event) => updateFinding('wallet_address', event.target.value)} placeholder="Wallet address" /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="transaction-hash">Transaction hash</Label><Input id="transaction-hash" className="font-mono" value={findingDetails.transaction_hash || ''} onChange={(event) => updateFinding('transaction_hash', event.target.value)} placeholder="Blockchain transaction hash" /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="exchange-name">Exchange / service</Label><Input id="exchange-name" value={findingDetails.exchange_name || ''} onChange={(event) => updateFinding('exchange_name', event.target.value)} placeholder="Attributed destination service" /></div>
                    </>
                  )}

                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="evidence-reference">Internal evidence reference</Label><Input id="evidence-reference" value={findingDetails.evidence_reference || ''} onChange={(event) => updateFinding('evidence_reference', event.target.value)} placeholder="Case report or evidence ID" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="finding-summary">Investigation summary</Label><Textarea id="finding-summary" value={findingDetails.summary || ''} onChange={(event) => updateFinding('summary', event.target.value)} placeholder="Describe the verified transaction path and finding…" rows={4} /></div>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-muted-foreground">Only publish findings supported by your case evidence. These details become visible to the client immediately.</div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phase-note">{t('customerDetail.phaseNote')}</Label>
              <Textarea id="phase-note" placeholder={t('customerDetail.phaseNotePlaceholder')} value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">{t('customerDetail.phaseNoteHint')}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirmPhaseUpdate} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPhase === 'review' ? 'Start investigation' : selectedPhase === 'completed' ? 'Publish results' : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
