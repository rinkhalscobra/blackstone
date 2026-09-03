import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency = 'EUR'): string => {
  const normalizedCurrency = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} ${normalizedCurrency}`;
  }
};

export const formatEuro = (amount: number): string => {
  return formatCurrency(amount, 'EUR');
};
