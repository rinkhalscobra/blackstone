import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

const Privacy = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-primary">{t('privacy.title')}</h1>
            
            <div className="prose prose-invert max-w-none space-y-6">
              <p className="text-sm text-muted-foreground mb-8">{t('privacy.lastUpdated')}</p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.introduction')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.introText')}
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.infoCollect')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.infoCollectText')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>{t('privacy.infoList1')}</li>
                <li>{t('privacy.infoList2')}</li>
                <li>{t('privacy.infoList3')}</li>
                <li>{t('privacy.infoList4')}</li>
                <li>{t('privacy.infoList5')}</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.howWeUse')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.howWeUseText')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>{t('privacy.useList1')}</li>
                <li>{t('privacy.useList2')}</li>
                <li>{t('privacy.useList3')}</li>
                <li>{t('privacy.useList4')}</li>
                <li>{t('privacy.useList5')}</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.dataSecurity')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.dataSecurityText')}
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.infoSharing')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.infoSharingText')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>{t('privacy.shareList1')}</li>
                <li>{t('privacy.shareList2')}</li>
                <li>{t('privacy.shareList3')}</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.yourRights')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.yourRightsText')}
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>{t('privacy.rightsList1')}</li>
                <li>{t('privacy.rightsList2')}</li>
                <li>{t('privacy.rightsList3')}</li>
                <li>{t('privacy.rightsList4')}</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{t('privacy.contactUs')}</h2>
              <p className="text-muted-foreground">
                {t('privacy.contactUsText')}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
