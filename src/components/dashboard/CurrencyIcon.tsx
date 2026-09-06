import { cn } from '@/lib/utils';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '\u20AC',
  USD: '$',
  CAD: 'C$',
};

export const CurrencyIcon = ({ currency, className }: { currency: string; className?: string }) => {
  const normalizedCurrency = currency.toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/45 font-mono text-sm font-semibold leading-none text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
        className,
      )}
    >
      {CURRENCY_SYMBOLS[normalizedCurrency] || '\u00A4'}
    </span>
  );
};

export default CurrencyIcon;
