import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCryptoPrices, type CryptoPrice } from '@/services/cryptoApi';
import { getExchangeRates } from '@/services/marketDataApi';

export interface PortfolioHolding {
  id: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  quantity: number;
  purchase_price: number;
  wallet_address?: string | null;
}

interface AccountValuationOptions {
  userId?: string;
  cashBalances?: Array<{ balance: number; currency: string }>;
  displayCurrency?: string;
}

const normalizeCurrency = (currency?: string) => (currency || 'USD').trim().toUpperCase();

/**
 * Values cash and crypto in one display currency.
 * Coinbase crypto quotes and portfolio purchase prices are stored in USD, so
 * they must be converted before they are shown as EUR (or another currency).
 */
export const useAccountValuation = ({
  userId,
  cashBalances = [],
  displayCurrency = 'USD',
}: AccountValuationOptions) => {
  const [items, setItems] = useState<PortfolioHolding[]>([]);
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [usdRates, setUsdRates] = useState<Record<string, number>>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const normalizedDisplayCurrency = normalizeCurrency(displayCurrency);
  const normalizedCashBalances = useMemo(
    () => cashBalances.map((balance) => ({
      balance: Number(balance.balance) || 0,
      currency: normalizeCurrency(balance.currency),
    })),
    [cashBalances],
  );
  const cashCurrencyKey = normalizedCashBalances.map((balance) => balance.currency).sort().join(',');

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setPrices({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('id, crypto_id, crypto_name, crypto_symbol, quantity, purchase_price, wallet_address')
        .eq('user_id', userId);

      if (error) throw error;

      const holdings = (data || []) as PortfolioHolding[];
      setItems(holdings);

      const cryptoIds = [...new Set(holdings.map((item) => item.crypto_id).filter(Boolean))];
      const currencies = [...new Set([
        ...cashCurrencyKey.split(',').filter(Boolean),
        normalizedDisplayCurrency,
      ])]
        .filter((currency) => currency !== 'USD');

      const [nextPrices, nextRates] = await Promise.all([
        cryptoIds.length ? getCryptoPrices(cryptoIds) : Promise.resolve({}),
        currencies.length ? getExchangeRates('USD', currencies) : Promise.resolve({}),
      ]);

      setPrices(nextPrices);
      setUsdRates({ USD: 1, ...nextRates });
    } catch (error) {
      console.error('Error calculating account value:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, normalizedDisplayCurrency, cashCurrencyKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`account-valuation-${userId}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portfolio_items', filter: `user_id=eq.${userId}` },
        () => { void refresh(); },
      )
      .subscribe();

    const interval = window.setInterval(() => { void refresh(); }, 10 * 60 * 1000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const valuation = useMemo(() => {
    const usdToDisplay = usdRates[normalizedDisplayCurrency];
    const hasConversion = Number.isFinite(usdToDisplay)
      && normalizedCashBalances.every((balance) => Number.isFinite(usdRates[balance.currency]));

    let portfolioUsd = 0;
    let investedUsd = 0;
    const holdings = items.map((item) => {
      const currentPriceUsd = prices[item.crypto_id]?.current_price || item.purchase_price;
      const currentValueUsd = item.quantity * currentPriceUsd;
      const investedValueUsd = item.quantity * item.purchase_price;
      portfolioUsd += currentValueUsd;
      investedUsd += investedValueUsd;

      return {
        ...item,
        currentPriceUsd,
        currentValueUsd,
        investedValueUsd,
        currentPrice: hasConversion ? currentPriceUsd * usdToDisplay : null,
        currentValue: hasConversion ? currentValueUsd * usdToDisplay : null,
        investedValue: hasConversion ? investedValueUsd * usdToDisplay : null,
      };
    });

    const cashValue = hasConversion
      ? normalizedCashBalances.reduce((total, balance) => (
        total + balance.balance * (usdToDisplay / usdRates[balance.currency])
      ), 0)
      : null;
    const portfolioValue = hasConversion ? portfolioUsd * usdToDisplay : null;
    const totalInvested = hasConversion ? investedUsd * usdToDisplay : null;
    const totalAccountValue = cashValue !== null && portfolioValue !== null
      ? cashValue + portfolioValue
      : null;

    return {
      holdings,
      cashValue,
      portfolioValue,
      totalInvested,
      totalAccountValue,
      profitLoss: portfolioValue !== null && totalInvested !== null
        ? portfolioValue - totalInvested
        : null,
      conversionAvailable: hasConversion,
    };
  }, [items, normalizedCashBalances, normalizedDisplayCurrency, prices, usdRates]);

  return {
    ...valuation,
    displayCurrency: normalizedDisplayCurrency,
    cashBalances: normalizedCashBalances,
    prices,
    isLoading,
    refresh,
  };
};
