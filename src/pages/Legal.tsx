import { PublicDocument } from '@/components/public/PublicDocument';
import { useLanguage } from '@/contexts/LanguageContext';
import { CompanyRegistration } from '@/components/CompanyRegistration';
import { companyCopy } from '@/i18n/company';

const Legal = () => {
  const { t, language } = useLanguage();
  return (
    <PublicDocument
      title={t('legal.title')}
      description={t('legal.intro')}
      sections={[
        { title: companyCopy[language].title, content: <CompanyRegistration /> },
        ...[1, 2, 3, 4, 5].map((index) => ({
          title: t(`legal.service${index}Title`),
          content: <p>{t(`legal.service${index}Desc`)}</p>,
        })),
      ]}
    />
  );
};
export default Legal;
