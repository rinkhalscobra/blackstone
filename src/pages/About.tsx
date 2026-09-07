import { PublicLayout, PublicPageHeader } from '@/components/public/PublicLayout';
import { CapabilitiesSection, ContactSection } from '@/components/public/PublicSections';
import { usePublicContent } from '@/i18n/publicSite';
import { recoveryHeroCopy } from '@/i18n/recoveryHero';
import { useLanguage } from '@/contexts/LanguageContext';

const About = () => {
  const p = usePublicContent();
  const { t, language } = useLanguage();
  return (
    <PublicLayout>
      <PublicPageHeader eyebrow={t('nav.about')} title={p('aboutTitle')} description={p('aboutIntro')} />
      <section className="public-section !pt-0">
        <div className="public-paper p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4b6757]">{p('approach')}</p>
          <div className="public-grid mt-6 grid gap-7 md:grid-cols-3">
            {recoveryHeroCopy[language].stages.map((stage, index) => (
              <article key={stage.label}>
                <span className="text-4xl font-light tabular-nums text-[#749080]">0{index + 1}</span>
                <h2 className="mt-5 text-xl font-medium">{stage.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#3b5345]">{stage.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CapabilitiesSection />
      <ContactSection />
    </PublicLayout>
  );
};
export default About;
