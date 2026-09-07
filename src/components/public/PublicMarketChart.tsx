import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { getTimeSeries, TOP_CRYPTO_SYMBOLS, CRYPTO_NAMES } from '@/services/marketDataApi';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

export const PublicMarketChart = () => {
  const [symbol, setSymbol] = useState('BTC/USD');
  const [interval, setInterval] = useState('1day');
  const p = usePublicContent();
  const { t, language } = useLanguage();
  const id = useId().replace(/:/g, '');
  const { data = [], isFetching } = useQuery({
    queryKey: ['public-market-chart', symbol, interval],
    queryFn: () => getTimeSeries(symbol, interval, '30'),
    staleTime: 600000,
    retry: false,
  });
  const points = data
    .map((item) => ({ date: item.datetime, price: Number(item.close) }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0)
    .reverse();
  const price = (value: number) =>
    new Intl.NumberFormat(language, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  return (
    <figure className="public-surface min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <figcaption>
          <span className="public-eyebrow">{p('market')}</span>
          <h2 className="mt-2 text-xl font-medium">{CRYPTO_NAMES[symbol.split('/')[0]]}</h2>
          <p className="mt-1 text-2xl font-medium tabular-nums">
            {points.length ? price(points[points.length - 1].price) : '—'}
          </p>
        </figcaption>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label={t('crypto.name')}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="rounded-lg border border-white/15 bg-[#111b14] px-3 py-2 text-sm"
          >
            {TOP_CRYPTO_SYMBOLS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <select
            aria-label={p('market')}
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
            className="rounded-lg border border-white/15 bg-[#111b14] px-3 py-2 text-sm"
          >
            <option value="1h">1H</option>
            <option value="4h">4H</option>
            <option value="1day">1D</option>
            <option value="1week">1W</option>
          </select>
        </div>
      </div>
      <div className="mt-7 h-72 min-w-0" aria-busy={isFetching}>
        {points.length === 0 ? (
          <div
            role="status"
            className="flex h-full items-center justify-center border-y border-dashed border-white/10 p-5 text-center text-sm text-neutral-500"
          >
            {isFetching ? t('crypto.loading') : p('unavailable')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a7d9b9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a7d9b9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#7f9286', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={35}
                tickFormatter={(value) => String(value).slice(5, 10)}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  background: '#101a13',
                  border: '1px solid #3b5042',
                  borderRadius: 8,
                  color: '#eef4f0',
                }}
                formatter={(value: number) => [price(value), t('crypto.price')]}
              />
              <Area
                dataKey="price"
                type="monotone"
                stroke="#a7d9b9"
                strokeWidth={2}
                fill={`url(#${id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </figure>
  );
};
