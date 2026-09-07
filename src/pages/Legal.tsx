import { PublicDocument } from '@/components/public/PublicDocument';
import { useLanguage } from '@/contexts/LanguageContext';

const Legal = () => {
  const { t } = useLanguage();
  return (
    <PublicDocument
      title={t('legal.title')}
      description={t('legal.intro')}
      sections={[1, 2, 3, 4, 5].map((index) => ({
        title: t(`legal.service${index}Title`),
        content: <p>{t(`legal.service${index}Desc`)}</p>,
      }))}
    />
  );
};
export default Legal;
