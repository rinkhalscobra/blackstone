import type { ReactNode } from 'react';
import { PublicLayout, PublicPageHeader, PublicTextLink } from './PublicLayout';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PublicDocumentSection {
  title: string;
  content: ReactNode;
}

export const PublicDocument = ({
  title,
  description,
  updated,
  sections,
}: {
  title: string;
  description?: string;
  updated?: string;
  sections: PublicDocumentSection[];
}) => {
  const p = usePublicContent();
  const { t } = useLanguage();
  return (
    <PublicLayout>
      <PublicPageHeader eyebrow={t('nav.legal')} title={title} description={description} />
      <div className="public-section public-grid grid items-start gap-8 !pt-0 lg:grid-cols-[minmax(14rem,.55fr)_minmax(0,2fr)]">
        <aside className="public-surface p-5 lg:sticky lg:top-32">
          <h2 className="public-eyebrow">{p('contents')}</h2>
          <nav className="mt-4 space-y-2" aria-label={p('contents')}>
            {sections.map((section, index) => (
              <a
                key={index}
                href={`#document-${index}`}
                className="block rounded-md py-2 text-sm text-neutral-400 hover:text-white"
              >
                {section.title}
              </a>
            ))}
          </nav>
          <div className="mt-5 border-t border-white/10 pt-5">
            <PublicTextLink to="/contact">{t('nav.contact')}</PublicTextLink>
          </div>
        </aside>
        <article className="public-document min-w-0">
          {updated && <p className="pb-5 text-xs text-neutral-500">{updated}</p>}
          {sections.map((section, index) => (
            <section id={`document-${index}`} key={index}>
              <h2>{section.title}</h2>
              {section.content}
            </section>
          ))}
        </article>
      </div>
    </PublicLayout>
  );
};
