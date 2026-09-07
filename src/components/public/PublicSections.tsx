import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Search,
  ShieldCheck,
  FileText,
  Layers3,
  Wallet,
  MessageSquare,
  GitBranch,
  CircleDot,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { usePublicContent } from '@/i18n/publicSite';
import { PublicSectionHeading, PublicTextLink } from './PublicLayout';
import { PublicMarket } from './PublicMarket';

const fundStages = [
  { id: 'located', description: 'locatedDesc', icon: Search },
  { id: 'verification', description: 'verificationDesc', icon: ShieldCheck },
  { id: 'pending', description: 'pendingDesc', icon: GitBranch },
  { id: 'available', description: 'availableDesc', icon: Wallet },
] as const;

export const LocatedFundsSection = () => {
  const p = usePublicContent();
  return (
    <section id="located-funds" className="public-section">
      <PublicSectionHeading eyebrow={p('funds')} title={p('fundsTitle')} description={p('fundsIntro')} />
      <Tabs defaultValue="located" className="public-surface">
        <TabsList
          aria-label={p('statusGuide')}
          className="grid h-auto auto-rows-fr grid-cols-2 items-stretch gap-0 rounded-none border-b border-white/10 bg-transparent p-0 md:grid-cols-4"
        >
          {fundStages.map((stage, index) => (
            <TabsTrigger
              key={stage.id}
              value={stage.id}
              className="h-full min-h-20 min-w-0 flex-col items-start gap-2 whitespace-normal rounded-none border-b border-r border-white/10 px-4 py-4 text-left text-neutral-400 transition-colors data-[state=active]:bg-[#dce7df] data-[state=active]:text-[#1b2b22] sm:px-6"
            >
              <span className="text-xs tabular-nums opacity-70">0{index + 1}</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <stage.icon className="h-4 w-4 shrink-0" />
                {p(stage.id)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {fundStages.map((stage) => (
          <TabsContent
            key={stage.id}
            value={stage.id}
            className="m-0 grid items-start gap-4 p-5 data-[state=inactive]:hidden sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-8"
          >
            <h3 className="text-lg font-medium leading-relaxed">{p(stage.id)}</h3>
            <div>
              <p className="public-description">{p(stage.description)}</p>
              <p className="mt-3 text-xs leading-relaxed text-neutral-500">{p('statusNote')}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

const caseTypes = [
  { id: 'investment', description: 'investmentDesc', icon: Layers3 },
  { id: 'wallet', description: 'walletDesc', icon: Wallet },
  { id: 'impersonation', description: 'impersonationDesc', icon: MessageSquare },
  { id: 'token', description: 'tokenDesc', icon: GitBranch },
] as const;

export const CaseTypesSection = () => {
  const p = usePublicContent();
  return (
    <section id="cases" className="public-section">
      <PublicSectionHeading eyebrow={p('cases')} title={p('casesTitle')} description={p('casesIntro')} />
      <Tabs
        defaultValue="investment"
        orientation="vertical"
        className="public-grid grid gap-5 lg:grid-cols-2 lg:gap-7"
      >
        <TabsList
          aria-label={p('cases')}
          className="flex h-auto flex-col justify-start gap-2 rounded-none bg-transparent p-0"
        >
          {caseTypes.map((item, index) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="group flex min-h-20 w-full justify-start gap-4 whitespace-normal rounded-lg border border-white/10 bg-transparent px-5 py-4 text-left text-neutral-400 transition-colors data-[state=active]:border-[#779685] data-[state=active]:bg-[#142019] data-[state=active]:text-white"
            >
              <span className="text-xs tabular-nums text-[#9bb7a7]">0{index + 1}</span>
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-base">{p(item.id)}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </TabsTrigger>
          ))}
        </TabsList>
        {caseTypes.map((item) => (
          <TabsContent
            key={item.id}
            value={item.id}
            className="public-paper m-0 flex flex-col justify-between gap-6 p-6 data-[state=inactive]:hidden sm:p-8"
          >
            <div>
              <item.icon className="mb-6 h-8 w-8" strokeWidth={1.4} />
              <h3 className="text-2xl font-medium tracking-tight">{p(item.id)}</h3>
              <p className="mt-4 text-base leading-relaxed text-[#384e40]">{p(item.description)}</p>
            </div>
            <div className="border-t border-black/15 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider">{p('evidenceLabel')}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#384e40]">{p('evidenceList')}</p>
              <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                {p('review')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export const CapabilitiesSection = () => {
  const p = usePublicContent();
  const items = [
    { title: 'records', description: 'recordsDesc', icon: FileText },
    { title: 'analysis', description: 'analysisDesc', icon: GitBranch },
    { title: 'findings', description: 'findingsDesc', icon: Layers3 },
  ] as const;
  return (
    <section id="evidence" className="public-section">
      <PublicSectionHeading
        eyebrow={p('principles')}
        title={p('capabilityTitle')}
        description={p('capabilityIntro')}
      />
      <div className="public-grid grid border-y border-white/10 md:grid-cols-3">
        {items.map((item, index) => (
          <article
            key={item.title}
            className={`py-7 ${index > 0 ? 'border-t border-white/10 md:border-l md:border-t-0 md:pl-7' : ''} ${index < 2 ? 'md:pr-7' : ''}`}
          >
            <div className="mb-5 flex items-center justify-between text-[#9fbdab]">
              <item.icon className="h-6 w-6" strokeWidth={1.4} />
              <span className="text-xs tabular-nums">0{index + 1}</span>
            </div>
            <h3 className="text-xl font-medium tracking-tight">{p(item.title)}</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">{p(item.description)}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export const MarketSection = () => {
  const p = usePublicContent();
  return (
    <section id="market" className="public-section">
      <PublicSectionHeading
        eyebrow={p('market')}
        title={p('marketTitle')}
        description={p('marketIntro')}
        action={<PublicTextLink to="/cryptocurrencies">{p('marketLink')}</PublicTextLink>}
      />
      <PublicMarket compact />
    </section>
  );
};

export const PUBLIC_FAQS = [
  { question: 'faq1', answer: 'answer1' },
  { question: 'faq2', answer: 'answer2' },
  { question: 'faq3', answer: 'answer3' },
  { question: 'faq4', answer: 'answer4' },
  { question: 'faq5', answer: 'answer5' },
] as const;

export const PublicFAQ = () => {
  const p = usePublicContent();
  return (
    <Accordion type="single" collapsible defaultValue="faq1" className="w-full">
      {PUBLIC_FAQS.map((item, index) => (
        <AccordionItem key={item.question} value={item.question} className="border-white/10">
          <AccordionTrigger className="gap-4 py-5 text-left text-base font-medium hover:no-underline">
            <span className="flex items-start gap-4">
              <span className="mt-0.5 text-xs tabular-nums text-[#9ebba9]">0{index + 1}</span>
              {p(item.question)}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-6 pl-8 text-sm leading-relaxed text-neutral-400">
            {p(item.answer)}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export const ClientCareSection = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const { user } = useAuth();
  return (
    <section id="questions" className="public-section">
      <PublicSectionHeading
        eyebrow={t('nav.faq')}
        title={p('faqTitle')}
        action={<PublicTextLink to="/faq">{p('readMore')}</PublicTextLink>}
      />
      <div className="public-grid grid items-start gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div className="public-surface p-6 sm:p-8">
          <MessageSquare className="h-7 w-7 text-[#aac9b7]" strokeWidth={1.4} />
          <p className="public-eyebrow mt-7">{p('care')}</p>
          <h3 className="mt-3 text-3xl font-medium tracking-tight">{p('careTitle')}</h3>
          <p className="public-description mt-4">{p('careIntro')}</p>
          <Link
            to={user ? '/dashboard/messages' : '/auth'}
            className="public-button public-button-outline mt-6"
          >
            {user ? t('nav.messages') : t('nav.login')}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <PublicFAQ />
      </div>
    </section>
  );
};

export const PUBLIC_PLANS = [
  {
    id: 'consultation',
    description: 'consultationDesc',
    monthly: 0,
    yearly: 0,
    features: ['initialReview', 'scopeDiscussion'],
  },
  {
    id: 'standard',
    description: 'standardDesc',
    monthly: 499,
    yearly: 4999,
    features: ['dedicated', 'analysis', 'updates'],
  },
  {
    id: 'priority',
    description: 'priorityDesc',
    monthly: 1499,
    yearly: 14999,
    features: ['senior', 'complex', 'findings'],
  },
] as const;

export const PricingSection = () => {
  const p = usePublicContent();
  const { language } = useLanguage();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const money = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  return (
    <section id="pricing" className="public-section">
      <PublicSectionHeading
        eyebrow={p('pricing')}
        title={p('pricingTitle')}
        description={p('pricingIntro')}
      />
      <div
        role="group"
        aria-label={p('pricing')}
        className="mb-5 inline-flex gap-1 rounded-lg border border-white/15 p-1"
      >
        {(['monthly', 'yearly'] as const).map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={billing === period}
            onClick={() => setBilling(period)}
            className={`rounded-md px-5 py-2 text-sm font-medium ${billing === period ? 'bg-[#e5ebe7] text-[#18251e]' : 'text-neutral-400 hover:text-white'}`}
          >
            {p(period)}
          </button>
        ))}
      </div>
      <div className="public-grid grid gap-4 md:grid-cols-3">
        {PUBLIC_PLANS.map((plan, index) => (
          <article
            key={plan.id}
            data-plan={plan.id}
            className={`flex min-w-0 flex-col rounded-xl border p-6 sm:p-7 ${index === 1 ? 'border-[#7c9a88] bg-[#142019]' : 'border-white/10 bg-[#0d110e]'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium">{p(plan.id)}</h3>
              <CircleDot className="h-4 w-4 text-[#96b5a3]" />
            </div>
            <p className="my-5 flex flex-wrap items-baseline gap-2">
              <span data-price className="text-4xl font-medium tracking-tight">
                {plan[billing] === 0 ? p('free') : money.format(plan[billing])}
              </span>
              {plan[billing] > 0 && (
                <span className="text-sm text-neutral-400">
                  {p(billing === 'monthly' ? 'month' : 'year')}
                </span>
              )}
            </p>
            <p className="min-h-12 text-sm leading-relaxed text-neutral-400">{p(plan.description)}</p>
            <ul className="mb-7 mt-6 space-y-3 border-t border-white/10 pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-neutral-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b0d3be]" />
                  {p(feature)}
                </li>
              ))}
            </ul>
            <Link
              className={`public-button mt-auto ${index === 1 ? '' : 'public-button-outline'}`}
              to={`/contact?plan=${plan.id}&billing=${billing}`}
            >
              {p('choose')}
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-neutral-500">{p('pricingNote')}</p>
    </section>
  );
};

export const ContactSection = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const { user } = useAuth();
  return (
    <section id="contact" className="public-section">
      <div className="public-paper public-grid grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#4b6757]">
            {t('nav.contact')}
          </p>
          <h2 className="public-section-title mt-4">{p('contactTitle')}</h2>
        </div>
        <div>
          <p className="text-base leading-relaxed text-[#3b5345]">{p('contactIntro')}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/contact" className="public-button !bg-[#182d20] !text-white hover:!bg-[#294433]">
              {p('review')}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to={user ? '/dashboard/messages' : '/auth'}
              className="inline-flex min-h-12 items-center gap-2 px-3 text-sm font-semibold"
            >
              {user ? t('nav.messages') : t('nav.login')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
