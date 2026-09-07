import { PublicLayout, PublicPageHeader } from '@/components/public/PublicLayout';
import { PublicMarket } from '@/components/public/PublicMarket';
import { PublicMarketChart } from '@/components/public/PublicMarketChart';
import { usePublicContent } from '@/i18n/publicSite';

const Cryptocurrencies = () => {
  const p = usePublicContent();
  return (
    <PublicLayout>
      <PublicPageHeader eyebrow={p('market')} title={p('marketTitle')} description={p('marketIntro')} />
      <section className="public-section !pt-0">
        <div className="public-grid grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
          <PublicMarket />
          <PublicMarketChart />
        </div>
      </section>
    </PublicLayout>
  );
};
export default Cryptocurrencies;
