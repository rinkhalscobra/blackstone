import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Target, Eye, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";

const About = () => {
  const { t } = useLanguage();

  const differentiators = [
    { titleKey: "about.clientCentric", descKey: "about.clientCentricDesc" },
    { titleKey: "about.experience", descKey: "about.experienceDesc" },
    { titleKey: "about.ethicalStandards", descKey: "about.ethicalStandardsDesc" },
    { titleKey: "about.expertiseInnovation", descKey: "about.expertiseInnovationDesc" },
    { titleKey: "about.extensiveDatabase", descKey: "about.extensiveDatabaseDesc" },
    { titleKey: "about.globalReach", descKey: "about.globalReachDesc" },
    { titleKey: "about.dataSecurity", descKey: "about.dataSecurityDesc" },
    { titleKey: "about.continuousImprovement", descKey: "about.continuousImprovementDesc" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-12">
              <Logo size="lg" showText={false} linkTo={undefined} />
            </div>
            
            <h1 className="text-5xl font-bold mb-8 text-primary">{t('about.title')}</h1>
            
            <div className="prose prose-invert max-w-none mb-12">
              <p className="text-lg text-muted-foreground mb-6">
                {t('about.description')}
              </p>
              
              <p className="text-sm text-muted-foreground mb-6">
                {t('about.registrationInfo')}
              </p>
            </div>
            
            <div className="bg-card border border-border rounded-2xl p-12 mb-12 text-center">
              <blockquote className="text-3xl font-bold text-primary mb-4">
                "{t('about.quote')}"
              </blockquote>
              <p className="text-muted-foreground">{t('about.quoteAuthor')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <div>
                <h2 className="text-3xl font-bold mb-6">{t('about.ourMission')}</h2>
                <p className="text-muted-foreground">
                  {t('about.missionDescription')}
                </p>
              </div>
              
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                  <div className="w-48 h-48 bg-gradient-to-br from-primary/50 to-primary/20 rounded-full flex items-center justify-center">
                    <Target className="w-24 h-24 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
              <div className="flex justify-center">
                <div className="relative w-64 h-64">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-48 h-48 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-primary/50 to-primary/20 rounded-full flex items-center justify-center">
                        <Eye className="w-16 h-16 text-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-6">{t('about.ourVision')}</h2>
                <p className="text-muted-foreground">
                  {t('about.visionDescription')}
                </p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-center text-primary mb-12">
              {t('about.whatSetsUsApart')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-20">
              {differentiators.map((item, index) => (
                <Card key={index} className="bg-card border-border p-6">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{t(item.titleKey)}</h3>
                      <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
