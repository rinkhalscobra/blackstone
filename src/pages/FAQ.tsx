import { PublicLayout, PublicPageHeader } from '@/components/public/PublicLayout';
import { PublicFAQ, ContactSection } from '@/components/public/PublicSections';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

const FAQ = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <PublicPageHeader eyebrow={t('nav.faq')} title={p('faqTitle')} description={p('contactIntro')} />
      <section className="public-section !pt-0">
        <div className="public-surface px-5 sm:px-8">
          <PublicFAQ />
        </div>
      </section>
      <ContactSection />
    </PublicLayout>
  );
};
export default FAQ;
