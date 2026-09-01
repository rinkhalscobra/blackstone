import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Watchlist = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">{t('crypto.watchlist')}</h1>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            {t('crypto.watchlistDescription')}
          </p>

          <Card className="bg-card border-border p-12">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Star className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">{t('crypto.watchlistEmpty')}</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {t('crypto.startAddingWatchlist')}
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Watchlist;
