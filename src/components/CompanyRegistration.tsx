import { useId } from 'react';
import { Building2, ArrowUpRight } from 'lucide-react';
import { COMPANY } from '@/config/company';
import { companyCopy } from '@/i18n/company';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export const CompanyRegistration = ({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) => {
  const { language } = useLanguage();
  const copy = companyCopy[language];
  const titleId = useId();
  return (
    <div
      role="region"
      aria-labelledby={titleId}
      data-company-registration
      className={cn('min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6', className)}
    >
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <Building2 className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {copy.title}
            </p>
            <h3 id={titleId} className="mt-2 text-base font-medium text-foreground">{COMPANY.legalName}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.operator}</p>
          </div>
        </div>
        <a
          href={COMPANY.registryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/15 px-4 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-white/5"
        >
          {copy.viewRecord}
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
      </div>
      <dl
        className={cn(
          'mt-5 grid gap-5 border-t border-white/10 pt-5 text-sm',
          compact ? 'sm:grid-cols-[1fr_2fr]' : 'sm:grid-cols-2 xl:grid-cols-4',
        )}
      >
        <div>
          <dt className="text-muted-foreground">{copy.corporation}</dt>
          <dd className="mt-1.5 font-medium tabular-nums text-foreground">{COMPANY.corporationNumber}</dd>
        </div>
        {!compact && (
          <>
            <div>
              <dt className="text-muted-foreground">{copy.business}</dt>
              <dd className="mt-1.5 font-medium tabular-nums text-foreground">{COMPANY.businessNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{copy.incorporated}</dt>
              <dd className="mt-1.5 text-foreground">
                <time dateTime={COMPANY.incorporatedOn}>
                  {new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(
                    new Date(`${COMPANY.incorporatedOn}T00:00:00Z`),
                  )}
                </time>
              </dd>
            </div>
          </>
        )}
        <div>
          <dt className="text-muted-foreground">{copy.office}</dt>
          <dd className="mt-1.5 leading-relaxed text-foreground">
            <address className="not-italic">{COMPANY.address}</address>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{copy.note}</p>
    </div>
  );
};
