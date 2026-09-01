import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const Portfolio = () => {
  const { t } = useLanguage();

  const features = [
    {
      title: t('crypto.realTimePriceData'),
      description: t('crypto.realTimePriceDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.freeToUse'),
      description: t('crypto.freeToUseDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.trackPortfolio'),
      description: t('crypto.trackPortfolioDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.dataSafe'),
      description: t('crypto.dataSafeDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.upToDateMarket'),
      description: t('crypto.realTimePriceDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.simpleAssetTracking'),
      description: t('crypto.simpleAssetDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.freeToUse'),
      description: t('crypto.freeToUseDesc'),
      color: "text-primary"
    },
    {
      title: t('crypto.accessAnywhere'),
      description: t('crypto.accessAnywhereDesc'),
      color: "text-primary"
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h1 className="text-5xl font-bold mb-6">
                <span className="text-primary">{t('crypto.cryptoPortfolioTracker')}</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                {t('crypto.portfolioDescription')}
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow">
                {t('crypto.createYourPortfolio')}
              </Button>
            </div>
            
            <div className="relative">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-card">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-transparent rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">€1,407,387.88</div>
                    <div className="text-success">+€3,402.23 (+4.89%)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {features.slice(0, 4).map((feature, index) => (
              <Card key={index} className="bg-secondary/50 border-border p-6">
                <h3 className={`text-xl font-semibold mb-3 ${feature.color}`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          {/* Watchlist Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="relative">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-card">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-transparent rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">{t('crypto.myWatchlist')}</div>
                    <div className="text-sm text-muted-foreground">{t('crypto.trackFavorites')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold mb-6">
                {t('crypto.buildWatchlist')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t('crypto.buildWatchlistDesc')}
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow">
                {t('crypto.buildYourWatchlist')}
              </Button>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 gap-6">
            {features.slice(4).map((feature, index) => (
              <Card key={index} className="bg-secondary/50 border-border p-6">
                <h3 className={`text-xl font-semibold mb-3 ${feature.color}`}>
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Portfolio;
