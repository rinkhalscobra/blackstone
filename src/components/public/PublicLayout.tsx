import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, ArrowRight } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import LanguageSelector from '@/components/LanguageSelector';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicContent } from '@/i18n/publicSite';
import { COMPANY, COMPANY_CONTACT } from '@/config/company';
import { CompanyRegistration } from '@/components/CompanyRegistration';
import '@/styles/showcase.css';
import '@/styles/public-site.css';

export const PUBLIC_CONTACT = COMPANY_CONTACT;

const PublicBrand = () => (
  <Link
    to="/"
    className="public-brand inline-flex min-w-0 items-center gap-2 font-semibold tracking-tight text-white"
  >
    <BrandMark className="h-8 w-8 shrink-0" />
    <span>{COMPANY.brand}</span>
  </Link>
);

const PublicNavigation = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { userRole } = useAdmin();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const dashboard =
    userRole === 'admin'
      ? '/admin'
      : userRole === 'group_admin'
        ? '/group-admin'
        : userRole === 'supervisor'
          ? '/supervisor'
          : userRole === 'agent'
            ? '/agent'
            : '/dashboard';
  const home = pathname === '/' || pathname === '/showcase';
  const sections = [
    { id: 'recovery', label: p('approach') },
    { id: 'cases', label: p('cases') },
    { id: 'located-funds', label: p('funds') },
    { id: 'pricing', label: p('pricing') },
    { id: 'contact', label: t('nav.contact') },
  ];
  const pages = [
    { href: '/about', label: t('nav.about') },
    { href: '/news', label: p('resources') },
    { href: '/faq', label: t('nav.faq') },
    { href: '/cryptocurrencies', label: p('market') },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#080b09]/95 backdrop-blur-xl">
      <div className="public-gutter flex h-16 items-center justify-between gap-3">
        <PublicBrand />
        <nav aria-label={p('explore')} className="hidden items-center gap-5 xl:flex">
          {sections.map((item) => (
            <a key={item.id} href={`${home ? '' : '/'}#${item.id}`} className="public-nav-link">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <LanguageSelector />
          <Link
            className="public-button public-button-small hidden sm:inline-flex"
            to={user ? dashboard : '/auth'}
          >
            {user ? t('nav.dashboard') : t('nav.login')}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="public-icon-button" aria-label={p('menu')}>
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[min(100%,380px)] overflow-y-auto border-white/10 bg-[#0d110e] text-white">
              <SheetHeader>
                <SheetTitle className="text-left text-white">{p('explore')}</SheetTitle>
              </SheetHeader>
              <nav aria-label={p('menu')} className="mt-7 grid gap-1">
                {sections.map((item) => (
                  <a
                    key={item.id}
                    onClick={() => setOpen(false)}
                    href={`${home ? '' : '/'}#${item.id}`}
                    className="rounded-lg px-3 py-3 text-base hover:bg-white/5"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="my-4 h-px bg-white/10" />
                {pages.map((item) => (
                  <Link
                    key={item.href}
                    onClick={() => setOpen(false)}
                    to={item.href}
                    className="rounded-lg px-3 py-3 text-sm text-neutral-300 hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to={user ? dashboard : '/auth'}
                  onClick={() => setOpen(false)}
                  className="public-button mt-5"
                >
                  {user ? t('nav.dashboard') : t('nav.login')}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

const PublicFooter = () => {
  const p = usePublicContent();
  const { t } = useLanguage();
  const groups = [
    {
      title: p('company'),
      links: [
        ['/about', t('nav.about')],
        ['/contact', t('nav.contact')],
        ['/faq', t('nav.faq')],
      ],
    },
    {
      title: p('resources'),
      links: [
        ['/news', p('resources')],
        ['/cryptocurrencies', p('market')],
        ['/categories', t('nav.categories')],
        ['/exchanges', t('nav.exchanges')],
      ],
    },
    {
      title: t('nav.legal'),
      links: [
        ['/legal', t('nav.legal')],
        ['/privacy', t('footer.privacyPolicy')],
        ['/disclaimer', t('footer.disclaimer')],
      ],
    },
  ];
  return (
    <footer className="public-gutter border-t border-white/10 bg-[#090c0a] py-9">
      <div className="grid gap-9 md:grid-cols-[1.3fr_2fr] lg:gap-16">
        <div>
          <PublicBrand />
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-neutral-400">{p('footerIntro')}</p>
          <a
            href={`mailto:${PUBLIC_CONTACT.email}`}
            className="mt-5 inline-flex items-center gap-2 text-sm text-[#c6d9ce] hover:text-white"
          >
            {PUBLIC_CONTACT.email}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="public-eyebrow">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map(([href, label]) => (
                  <li key={href}>
                    <Link to={href} className="text-sm text-neutral-300 hover:text-white">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <CompanyRegistration compact className="mt-8" />
      <div className="mt-9 flex flex-wrap justify-between gap-4 border-t border-white/10 pt-5 text-xs leading-relaxed text-neutral-500">
        <span>
          © {new Date().getFullYear()} {COMPANY.legalName} {p('rights')}
        </span>
      </div>
    </footer>
  );
};

export const PublicLayout = ({ children }: { children: ReactNode }) => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return (
    <div className="public-site showcase-root relative min-h-screen bg-[#080a09] text-white">
      <PublicNavigation />
      <main id="public-main">{children}</main>
      <PublicFooter />
    </div>
  );
};

export const PublicPageHeader = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <div className="public-gutter pb-7 pt-28">
    <p className="public-eyebrow flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
      {eyebrow}
    </p>
    <div className="mt-5 grid gap-5 border-b border-white/10 pb-7 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-10">
      <h1 className="public-page-title">{title}</h1>
      {description && <p className="public-description">{description}</p>}
    </div>
  </div>
);

export const PublicSectionHeading = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="mb-7 grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-10">
    <div>
      <p className="public-eyebrow">{eyebrow}</p>
      <h2 className="public-section-title mt-3">{title}</h2>
    </div>
    {(description || action) && (
      <div>
        {description && <p className="public-description">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    )}
  </div>
);

export const PublicTextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 text-sm font-medium text-[#c6d9ce] hover:text-white"
  >
    {children}
    <ArrowRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);
