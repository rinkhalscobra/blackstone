import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  Plus,
  SearchCheck,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { BALANCE_CURRENCIES } from '@/lib/balances';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type FundStatus = 'located' | 'verification_pending' | 'recovery_pending' | 'available';
type SourceType = 'bank' | 'crypto' | 'other';

interface RecoveryFund {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  source_type: string;
  source_name: string | null;
  reference: string | null;
  status: string;
  notes: string | null;
  visible_to_client: boolean;
  balance_credited_at: string | null;
  created_at: string;
}

const STATUS_OPTIONS: Array<{ value: FundStatus; label: string; description: string }> = [
  { value: 'located', label: 'Funds located', description: 'A potential recoverable amount has been identified.' },
  { value: 'verification_pending', label: 'Verification pending', description: 'Ownership and supporting evidence are being verified.' },
  { value: 'recovery_pending', label: 'Recovery in progress', description: 'Release or return procedures are underway.' },
  { value: 'available', label: 'Available in balance', description: 'Funds were released and credited to the matching balance.' },
];

const statusIndex = (status: string) => Math.max(0, STATUS_OPTIONS.findIndex((option) => option.value === status));
const statusOption = (status: string) => STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

const statusClass: Record<FundStatus, string> = {
  located: 'border-blue-500/25 bg-blue-500/10 text-blue-300',
  verification_pending: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  recovery_pending: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  available: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Please try again.';
};

const FundProgress = ({ status }: { status: string }) => {
  const current = statusIndex(status);
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label={`Recovery status: ${statusOption(status).label}`}>
      {STATUS_OPTIONS.map((option, index) => (
        <div key={option.value} className="space-y-1">
          <div className={cn('h-1.5 rounded-full transition-colors', index <= current ? 'bg-emerald-400' : 'bg-muted')} />
          <span className={cn('hidden text-[9px] leading-tight sm:block', index <= current ? 'text-foreground' : 'text-muted-foreground')}>
            {option.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export const RecoveryFundsPanel = ({
  customerId,
  casePhase,
  editable = false,
}: {
  customerId?: string;
  casePhase?: string | null;
  editable?: boolean;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [funds, setFunds] = useState<RecoveryFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [sourceType, setSourceType] = useState<SourceType>('bank');
  const [sourceName, setSourceName] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [visible, setVisible] = useState(true);

  const fetchFunds = useCallback(async () => {
    if (!customerId) {
      setFunds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('recovery_funds')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) console.error('Unable to load located funds:', error);
    setFunds((data as RecoveryFund[] | null) || []);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void fetchFunds();
    if (!customerId) return undefined;

    const channel = supabase
      .channel(`recovery-funds-${customerId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recovery_funds', filter: `customer_id=eq.${customerId}` }, () => {
        void fetchFunds();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [customerId, fetchFunds]);

  const totals = useMemo(() => Object.fromEntries(BALANCE_CURRENCIES.map((supportedCurrency) => [
    supportedCurrency,
    funds.filter((fund) => fund.currency === supportedCurrency).reduce((sum, fund) => sum + Number(fund.amount), 0),
  ])), [funds]);

  const resetForm = () => {
    setAmount('');
    setCurrency('EUR');
    setSourceType('bank');
    setSourceName('');
    setReference('');
    setNotes('');
    setVisible(true);
  };

  const addFund = async () => {
    if (!customerId || !user) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('recovery_funds').insert({
      customer_id: customerId,
      amount: numericAmount,
      currency,
      source_type: sourceType,
      source_name: sourceName.trim() || null,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      status: 'located',
      visible_to_client: visible,
      created_by: user.id,
      updated_by: user.id,
    });
    setSaving(false);

    if (error) {
      toast({ title: 'Unable to add located funds', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }

    toast({ title: 'Located funds added', description: 'The recovery workflow is now visible on the case.' });
    setDialogOpen(false);
    resetForm();
    await fetchFunds();
  };

  const updateFund = async (fund: RecoveryFund, changes: Partial<Pick<RecoveryFund, 'status' | 'visible_to_client'>>) => {
    if (!user) return;
    const nextStatus = changes.status;
    if (nextStatus === 'available' && !window.confirm(`Mark ${formatCurrency(fund.amount, fund.currency)} as available and credit it to the client's ${fund.currency} balance? This cannot be reversed.`)) return;

    const { error } = await supabase
      .from('recovery_funds')
      .update({ ...changes, updated_by: user.id })
      .eq('id', fund.id);

    if (error) {
      toast({ title: 'Unable to update funds', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }

    toast({
      title: nextStatus === 'available' ? 'Funds credited to balance' : 'Recovery status updated',
      description: nextStatus === 'available' ? `${formatCurrency(fund.amount, fund.currency)} is now available to the client.` : undefined,
    });
    await fetchFunds();
  };

  const deleteFund = async (fund: RecoveryFund) => {
    if (fund.balance_credited_at || !window.confirm('Delete this located-funds record?')) return;
    const { error } = await supabase.from('recovery_funds').delete().eq('id', fund.id);
    if (error) {
      toast({ title: 'Unable to delete funds', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    await fetchFunds();
  };

  if (!editable && casePhase !== 'completed') return null;

  return (
    <Card className="overflow-hidden border-emerald-500/20 bg-[radial-gradient(circle_at_top_right,rgb(16_185_129/0.09),transparent_32%),hsl(var(--card))]">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/25">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Located Funds</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">Verified case findings and recovery progress</p>
            </div>
          </div>
          {editable && casePhase === 'completed' && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add located funds</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add located funds</DialogTitle>
                  <DialogDescription>Record an amount identified by the completed investigation. It will not affect the client balance until marked Available.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="fund-amount">Amount</Label><Input id="fund-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div>
                  <div className="space-y-2"><Label>Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BALANCE_CURRENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Source type</Label><Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank">Bank transaction</SelectItem><SelectItem value="crypto">Blockchain transaction</SelectItem><SelectItem value="other">Other evidence</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="fund-source">Institution or source</Label><Input id="fund-source" value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Bank, exchange, or service" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="fund-reference">Reference</Label><Input id="fund-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transaction or evidence reference (optional)" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="fund-notes">Client update</Label><Textarea id="fund-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Short professional summary (optional)" /></div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2"><div><Label htmlFor="fund-visible">Visible to client</Label><p className="text-xs text-muted-foreground">Show this record in the client's case area.</p></div><Switch id="fund-visible" checked={visible} onCheckedChange={setVisible} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button onClick={addFund} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add funds</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        {casePhase !== 'completed' ? (
          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div><p className="font-medium">Available after investigation</p><p className="mt-1 text-sm text-muted-foreground">Complete and publish the global search before recording located funds.</p></div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading recovery funds...</div>
        ) : funds.length === 0 ? (
          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
            <SearchCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div><p className="font-medium">Fund allocation pending</p><p className="mt-1 text-sm text-muted-foreground">The investigation is complete. Located amounts are awaiting final analyst allocation.</p></div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {BALANCE_CURRENCIES.map((supportedCurrency) => (
                <div key={supportedCurrency} className="rounded-xl border border-border bg-background/35 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Located · {supportedCurrency}</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(Number(totals[supportedCurrency]) || 0, supportedCurrency)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {funds.map((fund) => {
                const option = statusOption(fund.status);
                const SourceIcon = fund.source_type === 'bank' ? Landmark : fund.source_type === 'crypto' ? Bitcoin : ShieldCheck;
                return (
                  <div key={fund.id} className="rounded-xl border border-border bg-background/35 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><SourceIcon className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="text-lg font-semibold">{formatCurrency(fund.amount, fund.currency)}</p><Badge variant="outline" className={statusClass[option.value]}>{option.label}</Badge>{!fund.visible_to_client && editable && <Badge variant="outline"><EyeOff className="mr-1 h-3 w-3" />Hidden</Badge>}</div>
                          <p className="mt-0.5 text-sm text-muted-foreground">{fund.source_name || (fund.source_type === 'bank' ? 'Banking evidence' : fund.source_type === 'crypto' ? 'Blockchain evidence' : 'Investigation evidence')}</p>
                          {fund.reference && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Ref: {fund.reference}</p>}
                          {fund.notes && <p className="mt-2 text-sm text-muted-foreground">{fund.notes}</p>}
                        </div>
                      </div>
                      {editable && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Select value={fund.status} onValueChange={(status) => void updateFund(fund, { status })} disabled={Boolean(fund.balance_credited_at)}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
                          <Button size="icon" variant="outline" title={fund.visible_to_client ? 'Hide from client' : 'Show to client'} onClick={() => void updateFund(fund, { visible_to_client: !fund.visible_to_client })}>{fund.visible_to_client ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                          <Button size="icon" variant="outline" className="text-destructive" disabled={Boolean(fund.balance_credited_at)} onClick={() => void deleteFund(fund)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4"><FundProgress status={fund.status} /></div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">{fund.status === 'available' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Clock3 className="h-3.5 w-3.5" />} {option.description}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecoveryFundsPanel;
