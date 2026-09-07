import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Logo from './Logo';
import { CompanyRegistration } from './CompanyRegistration';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card">
      <div className="container px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Logo size="md" linkTo="/" />
            <p className="text-sm text-muted-foreground mt-4">{t('footer.description')}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-primary">{t('footer.products')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/cryptocurrencies" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.cryptocurrencies')}
                </Link>
              </li>
              <li>
                <Link to="/exchanges" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.exchanges')}
                </Link>
              </li>
              <li>
                <Link to="/watchlist" className="text-sm text-muted-foreground hover:text-primary">
                  {t('footer.watchlist')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-primary">{t('footer.company')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/legal" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.legal')}
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" className="text-sm text-muted-foreground hover:text-primary">
                  {t('footer.disclaimer')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-primary">{t('footer.supportSection')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary">
                  {t('nav.faq')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <CompanyRegistration compact className="mb-8" />
        <div className="border-t border-border pt-8">
          <p className="text-xs text-muted-foreground mb-4">
            <strong>{t('footer.disclaimer').toUpperCase()}:</strong> {t('footer.disclaimerText')}
          </p>

          <p className="text-xs text-muted-foreground mb-4">{t('footer.infoText')}</p>

          <p className="text-xs text-muted-foreground">{t('footer.paymentText')}</p>

          <p className="text-xs text-muted-foreground mt-4">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
