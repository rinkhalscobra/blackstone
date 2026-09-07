import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PublicLayout, PublicPageHeader } from '@/components/public/PublicLayout';
import { usePublicContent } from '@/i18n/publicSite';

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const p = usePublicContent();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <PublicLayout>
      <PublicPageHeader eyebrow="404" title={p('notFound')} />
      <div className="public-section min-h-[40vh] !pt-0">
        <Link to="/" className="public-button">
          {t('pages.returnHome')}
        </Link>
      </div>
    </PublicLayout>
  );
};

export default NotFound;
