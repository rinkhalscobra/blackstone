export const BALANCE_CURRENCIES = ["EUR", "USD", "CAD"] as const;

export type BalanceCurrency = (typeof BALANCE_CURRENCIES)[number];

export interface CurrencyBalance {
  id: string;
  currency: string;
  balance: number;
}

export const normalizeBalanceCurrency = (currency?: string | null): BalanceCurrency => {
  const normalized = currency?.trim().toUpperCase();
  return BALANCE_CURRENCIES.includes(normalized as BalanceCurrency)
    ? normalized as BalanceCurrency
    : "USD";
};

export const balanceForCurrency = (
  balances: CurrencyBalance[],
  currency: string,
) => balances.find((balance) => balance.currency.toUpperCase() === currency.toUpperCase())?.balance ?? 0;
