import { FileText, Coins, Wallet } from 'lucide-react';
import { PublicLayout, PublicPageHeader, PublicTextLink } from '@/components/public/PublicLayout';
import { ContactSection } from '@/components/public/PublicSections';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

const Categories = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const entries = [
    { title: 'native', description: 'nativeDesc', icon: Coins },
    { title: 'tokens', description: 'tokensDesc', icon: FileText },
    { title: 'balances', description: 'balancesDesc', icon: Wallet },
  ] as const;
  return (
    <PublicLayout>
      <PublicPageHeader
        eyebrow={t('nav.categories')}
        title={p('categoriesTitle')}
        description={p('categoriesIntro')}
      />
      <section className="public-section !pt-0">
        <div className="public-grid grid gap-5 md:grid-cols-3">
          {entries.map((item, index) => (
            <article key={item.title} className="public-surface p-6 sm:p-8">
              <div className="flex justify-between text-[#abcbb8]">
                <item.icon className="h-7 w-7" strokeWidth={1.4} />
                <span className="text-xs">0{index + 1}</span>
              </div>
              <h2 className="mt-7 text-2xl font-medium">{p(item.title)}</h2>
              <p className="public-description mt-4">{p(item.description)}</p>
            </article>
          ))}
        </div>
        <div className="mt-6">
          <PublicTextLink to="/cryptocurrencies">{p('marketLink')}</PublicTextLink>
        </div>
      </section>
      <ContactSection />
    </PublicLayout>
  );
};
export default Categories;
