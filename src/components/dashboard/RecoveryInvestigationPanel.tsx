import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bitcoin,
  CheckCircle2,
  Clock3,
  Database,
  Hash,
  Landmark,
  MapPin,
  Radar,
  Route,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface RecoveryInvestigationData {
  searchStartedAt?: string | null;
  searchDurationMinutes?: number | null;
  searchScope?: string | null;
  resultType?: string | null;
  resultDetails?: Json | null;
  completedAt?: string | null;
}

interface RecoveryInvestigationPanelProps extends RecoveryInvestigationData {
  phase: string | null | undefined;
}

type DetailRecord = Record<string, string>;

const searchEvents = {
  both: [
    ['Blockchain intelligence', 'Tracing cross-network transaction paths'],
    ['Banking reference index', 'Correlating transfer identifiers'],
    ['Address attribution', 'Reviewing wallet relationships'],
    ['Institutional records', 'Matching beneficiary information'],
  ],
  crypto: [
    ['Bitcoin network', 'Following transaction outputs'],
    ['Ethereum network', 'Resolving contract interactions'],
    ['Address attribution', 'Reviewing wallet relationships'],
    ['Exchange endpoints', 'Correlating destination services'],
  ],
  bank: [
    ['Banking reference index', 'Correlating transfer identifiers'],
    ['Payment rails', 'Reviewing routing information'],
    ['Institutional records', 'Matching beneficiary information'],
    ['Cross-border network', 'Following intermediary institutions'],
  ],
};

const resultLabels: Record<string, string> = {
  amount: 'Identified amount',
  currency: 'Currency',
  bank_name: 'Financial institution',
  beneficiary_name: 'Beneficiary',
  account_reference: 'Account reference',
  transaction_reference: 'Transaction reference',
  transaction_date: 'Transaction date',
  country: 'Jurisdiction',
  asset: 'Digital asset',
  network: 'Network',
  wallet_address: 'Attributed wallet',
  transaction_hash: 'Transaction hash',
  exchange_name: 'Exchange / service',
  evidence_reference: 'Evidence reference',
  summary: 'Investigation summary',
};

const resultOrder = [
  'amount', 'currency', 'bank_name', 'beneficiary_name', 'account_reference',
  'transaction_reference', 'transaction_date', 'country', 'asset', 'network',
  'wallet_address', 'transaction_hash', 'exchange_name', 'evidence_reference', 'summary',
];

const toDetailRecord = (value: Json | null | undefined): DetailRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== null && fieldValue !== '')
      .map(([key, fieldValue]) => [key, String(fieldValue)]),
  );
};

const formatRemaining = (remainingMs: number) => {
  if (remainingMs <= 0) return 'Analysis window complete';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

const GlobeScanner = ({ scope, activeIndex, running }: { scope: string; activeIndex: number; running: boolean }) => (
  <div className="relative mx-auto flex h-52 w-52 shrink-0 items-center justify-center sm:h-60 sm:w-60">
    <div className={cn('absolute inset-0 rounded-full border border-primary/15', running && 'animate-pulse')} />
    <div className="absolute inset-5 rounded-full border border-primary/20" />
    <div className={cn('absolute inset-0 rounded-full border border-dashed border-primary/30', running && 'animate-[spin_12s_linear_infinite]')}>
      <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" />
    </div>
    <div className={cn('absolute inset-3 rounded-full border border-dashed border-emerald-500/25', running && 'animate-[spin_18s_linear_infinite_reverse]')}>
      <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgb(52_211_153)]" />
    </div>
    <div className="relative h-36 w-36 overflow-hidden rounded-full border border-primary/50 bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/0.28),hsl(var(--card))_55%,hsl(var(--background)))] shadow-[0_0_45px_hsl(var(--primary)/0.18)] sm:h-40 sm:w-40">
      <div className={cn('absolute inset-[-25%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,hsl(var(--primary)/0.4)_350deg,transparent_360deg)]', running && 'animate-[spin_5s_linear_infinite]')} />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/20" />
      <div className="absolute left-[25%] top-0 h-full w-[50%] rounded-[50%] border-x border-primary/20" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary/20" />
      <div className="absolute left-0 top-[28%] h-[44%] w-full rounded-[50%] border-y border-primary/20" />
      {[
        ['left-[30%] top-[25%]', 'delay-0'],
        ['right-[24%] top-[42%]', 'delay-300'],
        ['left-[42%] bottom-[20%]', 'delay-700'],
      ].map(([position, delay], index) => (
        <span key={position} className={cn('absolute h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]', running && 'animate-ping', position, delay, index !== activeIndex % 3 && 'opacity-50')} />
      ))}
    </div>
    <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-primary/30 bg-background/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary shadow-lg backdrop-blur">
      <Radar className="h-3 w-3 animate-pulse" /> {scope === 'both' ? 'Multi-network' : scope}
    </div>
  </div>
);

export const RecoveryInvestigationPanel = ({
  phase,
  searchStartedAt,
  searchDurationMinutes,
  searchScope,
  resultType,
  resultDetails,
  completedAt,
}: RecoveryInvestigationPanelProps) => {
  const [now, setNow] = useState(Date.now());
  const scope = searchScope === 'bank' || searchScope === 'crypto' ? searchScope : 'both';
  const events = searchEvents[scope];
  const activeIndex = Math.floor(now / 2600) % events.length;
  const details = useMemo(() => toDetailRecord(resultDetails), [resultDetails]);

  useEffect(() => {
    if (phase !== 'review') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  if (phase === 'review') {
    const started = searchStartedAt ? new Date(searchStartedAt).getTime() : now;
    const durationMs = Math.max(1, searchDurationMinutes || 4320) * 60000;
    const elapsed = Math.max(0, now - started);
    const progress = Math.min(100, (elapsed / durationMs) * 100);
    const remaining = durationMs - elapsed;

    return (
      <div className="overflow-hidden rounded-xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_45%),linear-gradient(to_bottom,hsl(var(--card)),hsl(var(--background)/0.75))] p-4 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <GlobeScanner scope={scope} activeIndex={activeIndex} running={remaining > 0} />
          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                  <span className={cn('mr-2 h-1.5 w-1.5 rounded-full', remaining > 0 ? 'animate-pulse bg-emerald-400' : 'bg-amber-400')} />
                  {remaining > 0 ? 'Investigation active' : 'Awaiting publication'}
                </Badge>
                <span className="text-xs text-muted-foreground">Case-controlled analysis window</span>
              </div>
              <h3 className="text-xl font-semibold tracking-tight">Transaction tracing in progress</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                An investigation specialist is reviewing the configured {scope === 'both' ? 'banking and blockchain' : scope} evidence sources.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">Investigation window</span>
                <span className={cn('font-mono', remaining <= 0 ? 'text-amber-400' : 'text-primary')}>{formatRemaining(remaining)}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{Math.round(progress)}% elapsed</span>
                <span>{searchDurationMinutes || 4320} min configured</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {events.map(([title, description], index) => {
                const isActive = remaining > 0 && index === activeIndex;
                return (
                  <div key={title} className={cn('flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-all duration-500', isActive ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-background/35 opacity-65')}>
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {title.includes('Bank') || title.includes('Institution') || title.includes('Payment') ? <Landmark className="h-4 w-4" /> : <Bitcoin className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{description}</p>
                    </div>
                    {isActive && <span className="ml-auto h-2 w-2 shrink-0 animate-ping rounded-full bg-primary" />}
                  </div>
                );
              })}
            </div>

            {remaining <= 0 && (
              <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p><span className="font-medium text-foreground">Analysis window complete.</span> Findings are awaiting analyst verification before publication.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase !== 'completed') return null;

  const amount = details.amount && details.currency
    ? formatCurrency(Number(details.amount) || 0, details.currency)
    : null;
  const entries = resultOrder.filter((key) => details[key] && !['amount', 'currency'].includes(key));
  const isCrypto = resultType === 'crypto_transaction';

  if (!resultType || Object.keys(details).length === 0) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <h3 className="font-semibold">Findings awaiting publication</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your case is marked complete, but the investigation specialist has not yet published the supporting transaction details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/25 bg-[radial-gradient(circle_at_top_right,rgb(16_185_129/0.12),transparent_35%),hsl(var(--card))]">
      <div className="border-b border-emerald-500/15 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <Badge className="mb-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">Findings published</Badge>
              <h3 className="text-xl font-semibold">Transaction path identified</h3>
            </div>
          </div>
          {amount && <div className="text-left sm:text-right"><p className="text-xs text-muted-foreground">Identified value</p><p className="text-2xl font-bold text-emerald-400">{amount}</p></div>}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isCrypto ? <Bitcoin className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Finding type</p>
            <p className="font-medium">{isCrypto ? 'Blockchain transaction' : 'Bank transaction'}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
        </div>

        {entries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {entries.map((key) => {
              const fullWidth = ['wallet_address', 'transaction_hash', 'summary'].includes(key);
              const FieldIcon = key === 'wallet_address' ? Wallet : key === 'transaction_hash' ? Hash : key === 'country' ? MapPin : key === 'summary' ? Route : Database;
              return (
                <div key={key} className={cn('min-w-0 rounded-lg border border-border bg-background/35 p-3.5', fullWidth && 'sm:col-span-2')}>
                  <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><FieldIcon className="h-3.5 w-3.5" />{resultLabels[key] || key.replace(/_/g, ' ')}</dt>
                  <dd className={cn('mt-1 break-all text-sm font-medium', ['wallet_address', 'transaction_hash', 'transaction_reference', 'evidence_reference'].includes(key) && 'font-mono')}>{details[key]}</dd>
                </div>
              );
            })}
          </dl>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Analyst-reported investigation finding</span>
          {completedAt && <span>Published {new Date(completedAt).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
};
