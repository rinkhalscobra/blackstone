import { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { PublicLayout, PublicPageHeader, PublicTextLink } from '@/components/public/PublicLayout';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { usePublicContent } from '@/i18n/publicSite';

const News = () => {
  const p = usePublicContent();
  const [search, setSearch] = useState('');
  const guides = [
    { title: 'preparation', description: 'preparationDesc', body: 'answer1' },
    { title: 'statusGuide', description: 'fundsIntro', body: 'answer2' },
    { title: 'careTitle', description: 'careIntro', body: 'answer3' },
  ] as const;
  const filtered = guides.filter((guide) =>
    `${p(guide.title)} ${p(guide.description)}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <PublicLayout>
      <PublicPageHeader eyebrow={p('resources')} title={p('newsTitle')} description={p('newsIntro')} />
      <section className="public-section !pt-0">
        <label className="public-surface mb-6 flex items-center gap-3 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" />
          <span className="sr-only">{p('resources')}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={p('resources')}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <Accordion type="single" collapsible className="space-y-4">
          {filtered.map((guide) => (
            <AccordionItem key={guide.title} value={guide.title} className="public-surface px-5 sm:px-7">
              <AccordionTrigger className="gap-4 py-6 text-left hover:no-underline">
                <span className="flex items-start gap-4">
                  <FileText className="mt-1 h-5 w-5 shrink-0 text-[#a5cbb4]" />
                  <span>
                    <span className="block text-xl font-medium">{p(guide.title)}</span>
                    <span className="mt-3 block text-sm font-normal leading-relaxed text-neutral-400">
                      {p(guide.description)}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="border-t border-white/10 py-5 text-base leading-relaxed text-neutral-300">
                {p(guide.body)}
                <div className="mt-5">
                  <PublicTextLink to="/faq">{p('readMore')}</PublicTextLink>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {filtered.length === 0 && (
          <p role="status" className="public-description py-8">
            {p('emptySearch')}
          </p>
        )}
      </section>
    </PublicLayout>
  );
};
export default News;
