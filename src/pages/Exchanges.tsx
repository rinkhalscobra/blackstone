import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw } from 'lucide-react';
import { getCryptoExchanges } from '@/services/marketDataApi';
import { PublicLayout, PublicPageHeader } from '@/components/public/PublicLayout';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

const Exchanges = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const {
    data = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['public-exchanges'],
    queryFn: getCryptoExchanges,
    staleTime: 600000,
    retry: false,
  });
  const entries = data.filter((item) =>
    `${item.name} ${item.code}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <PublicLayout>
      <PublicPageHeader
        eyebrow={t('nav.exchanges')}
        title={p('exchangesTitle')}
        description={p('exchangesIntro')}
      />
      <section className="public-section !pt-0">
        <div className="public-surface">
          <div className="flex items-center gap-4 border-b border-white/10 p-5">
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="sr-only">{p('search')}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={p('search')}
                className="w-full bg-transparent text-sm"
              />
            </label>
            <button
              type="button"
              aria-label={p('refresh')}
              onClick={() => refetch()}
              disabled={isFetching}
              className="public-icon-button"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-neutral-500">
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t('crypto.name')}
                  </th>
                  <th scope="col" className="px-5 py-4 font-medium">
                    {t('crypto.code')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={`${item.code}-${item.name}`} className="border-b border-white/5">
                    <td className="px-5 py-4 font-medium">{item.name}</td>
                    <td className="px-5 py-4 text-neutral-400">{item.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <p role="status" className="p-6 text-sm text-neutral-400">
              {isFetching ? t('crypto.loading') : data.length > 0 ? p('emptySearch') : p('unavailable')}
            </p>
          )}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">{p('directoryNote')}</p>
      </section>
    </PublicLayout>
  );
};
export default Exchanges;
