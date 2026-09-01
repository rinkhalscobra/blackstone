import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Disclaimer = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-primary">{t('disclaimer.title')}</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-muted-foreground">
                {t('disclaimer.websiteInfo')}
              </p>

              <p className="text-muted-foreground">
                {t('disclaimer.servicesInfo')}
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('disclaimer.importantInfo')}</h2>

              <p className="text-muted-foreground">
                {t('disclaimer.importantInfoText')}
              </p>

              <p className="text-muted-foreground">
                {t('disclaimer.paymentMethods')}
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('disclaimer.noGuarantees')}</h2>

              <p className="text-muted-foreground">
                {t('disclaimer.noGuaranteesText')}
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('disclaimer.legalAdvice')}</h2>

              <p className="text-muted-foreground">
                {t('disclaimer.legalAdviceText')}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disclaimer;
