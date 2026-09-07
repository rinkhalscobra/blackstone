import { PublicDocument } from '@/components/public/PublicDocument';
import { useLanguage } from '@/contexts/LanguageContext';

const Disclaimer = () => {
  const { t } = useLanguage();
  return (
    <PublicDocument
      title={t('disclaimer.title')}
      description={t('disclaimer.websiteInfo')}
      sections={[
        {
          title: t('disclaimer.importantInfo'),
          content: (
            <>
              <p>{t('disclaimer.servicesInfo')}</p>
              <p>{t('disclaimer.importantInfoText')}</p>
              <p>{t('disclaimer.paymentMethods')}</p>
            </>
          ),
        },
        { title: t('disclaimer.noGuarantees'), content: <p>{t('disclaimer.noGuaranteesText')}</p> },
        { title: t('disclaimer.legalAdvice'), content: <p>{t('disclaimer.legalAdviceText')}</p> },
      ]}
    />
  );
};
export default Disclaimer;
