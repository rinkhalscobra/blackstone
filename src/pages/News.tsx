import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const News = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{t('pages.newsTitle')}</h1>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            {t('pages.newsDescription')}
          </p>
          
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-foreground">
              ℹ️ {t('pages.newsSource')}{" "}
              <a href="#" className="text-primary hover:underline">{t('pages.here')}</a>.
            </p>
          </div>
          
          <div className="relative max-w-2xl mx-auto mb-12">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder={t('pages.searchCoin')} 
              className="pl-10 pr-10 bg-card border-border h-12"
            />
            <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer" />
          </div>
          
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-32 h-32 bg-muted/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-16 h-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground">{t('pages.noDataDisplay')}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default News;
