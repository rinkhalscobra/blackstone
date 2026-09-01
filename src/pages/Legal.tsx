import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Legal = () => {
  const { t } = useLanguage();

  const services = [
    { titleKey: "legal.service1Title", descKey: "legal.service1Desc" },
    { titleKey: "legal.service2Title", descKey: "legal.service2Desc" },
    { titleKey: "legal.service3Title", descKey: "legal.service3Desc" },
    { titleKey: "legal.service4Title", descKey: "legal.service4Desc" },
    { titleKey: "legal.service5Title", descKey: "legal.service5Desc" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-primary">{t('legal.title')}</h1>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground mb-8">
                {t('legal.intro')}
              </p>

              <h2 className="text-2xl font-bold text-primary mb-6">{t('legal.typesOfServices')}</h2>

              <div className="space-y-8">
                {services.map((service, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-3 mb-4">
                      <ChevronRight className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-xl font-semibold mb-3">
                          {t(service.titleKey)}
                        </h3>
                        <p className="text-muted-foreground">
                          {t(service.descKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
