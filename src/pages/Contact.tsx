import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Phone, Copy, ArrowUpRight, FileText } from 'lucide-react';
import { CompanyRegistration } from '@/components/CompanyRegistration';
import { PublicLayout, PublicPageHeader, PUBLIC_CONTACT } from '@/components/public/PublicLayout';
import { PUBLIC_PLANS } from '@/components/public/PublicSections';
import { usePublicContent } from '@/i18n/publicSite';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const Contact = () => {
  const p = usePublicContent();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const plan = PUBLIC_PLANS.find((item) => item.id === params.get('plan'));
  const billing = params.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const enquiry = plan ? `${p('review')} — ${p(plan.id)} (${p(billing)})` : p('review');
  const emailHref = `mailto:${PUBLIC_CONTACT.email}?subject=${encodeURIComponent(enquiry)}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t('common.copied'), description: t('common.copiedToClipboard') });
    } catch {
      toast({ title: t('auth.error'), description: t('auth.unexpectedError'), variant: 'destructive' });
    }
  };
  return (
    <PublicLayout>
      <PublicPageHeader
        eyebrow={t('nav.contact')}
        title={p('contactTitle')}
        description={p('contactIntro')}
      />
      <section className="public-section !pt-0">
        {plan && (
          <div
            data-selected-plan={plan.id}
            className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#789886] bg-[#132118] p-5"
          >
            <div>
              <p className="public-eyebrow">{p('chosen')}</p>
              <h2 className="mt-2 text-lg font-medium">
                {p(plan.id)} · {p(billing)}
              </h2>
            </div>
            <span className="text-xl font-medium">
              {plan[billing] === 0
                ? p('free')
                : new Intl.NumberFormat(language, {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(plan[billing])}
            </span>
          </div>
        )}
        <div className="public-grid grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="public-surface divide-y divide-white/10">
            {[
              { label: p('email'), value: PUBLIC_CONTACT.email, href: emailHref, icon: Mail },
              {
                label: p('phone'),
                value: PUBLIC_CONTACT.phone,
                href: `tel:${PUBLIC_CONTACT.phoneHref}`,
                icon: Phone,
              },
            ].map((item) => (
              <div key={item.label} className="p-6 sm:p-8">
                <div className="mb-5 flex items-center gap-3 text-[#a6c7b3]">
                  <item.icon className="h-5 w-5" />
                  <h2 className="text-sm font-medium">{item.label}</h2>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.href}
                    className="min-w-0 break-words text-xl font-medium tracking-tight hover:text-[#b7d5c3] sm:text-2xl"
                  >
                    {item.value}
                  </a>
                  <button
                    type="button"
                    aria-label={`${p('copy')} ${item.value}`}
                    className="public-icon-button"
                    onClick={() => copy(item.value)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="public-paper flex flex-col justify-between gap-7 p-6 sm:p-8">
            <div>
              <FileText className="mb-6 h-7 w-7" strokeWidth={1.4} />
              <h2 className="text-2xl font-medium tracking-tight">{p('preparation')}</h2>
              <p className="mt-4 text-base leading-relaxed text-[#3b5345]">{p('preparationDesc')}</p>
            </div>
            <Link
              to={user ? '/dashboard/messages' : '/auth'}
              className="inline-flex items-center gap-2 text-sm font-semibold"
            >
              {user ? t('nav.messages') : t('nav.login')}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <CompanyRegistration className="mt-7" />
      </section>
    </PublicLayout>
  );
};
export default Contact;
