import { Card } from "@/components/ui/card";
import { DollarSign, Bitcoin, TrendingUp, Heart, Home, CreditCard, LineChart, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ScamTypes = () => {
  const { t } = useLanguage();

  const scamTypes = [
    { icon: DollarSign, titleKey: "scamTypes.binaryOptions", color: "text-primary" },
    { icon: Bitcoin, titleKey: "scamTypes.digitalCurrency", color: "text-primary" },
    { icon: TrendingUp, titleKey: "scamTypes.forex", color: "text-primary" },
    { icon: Heart, titleKey: "scamTypes.romance", color: "text-primary" },
    { icon: Home, titleKey: "scamTypes.propertyScams", color: "text-primary" },
    { icon: CreditCard, titleKey: "scamTypes.creditCardPhishing", color: "text-primary" },
    { icon: LineChart, titleKey: "scamTypes.stockTrading", color: "text-primary" },
    { icon: AlertTriangle, titleKey: "scamTypes.otherScams", color: "text-primary" },
  ];

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t('scamTypes.title')} <span className="text-primary">{t('scamTypes.titleHighlight')}</span> {t('scamTypes.titleEnd')}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {scamTypes.map((scam, index) => {
            const Icon = scam.icon;
            return (
              <Card key={index} className="bg-card border-border p-6 hover:border-primary transition-colors cursor-pointer">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className={`h-8 w-8 ${scam.color}`} />
                  </div>
                  <h3 className="font-semibold">{t(scam.titleKey)}</h3>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ScamTypes;
