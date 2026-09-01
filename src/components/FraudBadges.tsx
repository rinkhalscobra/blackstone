import { useLanguage } from "@/contexts/LanguageContext";

const FraudBadges = () => {
  const { t } = useLanguage();
  
  const badges = [
    { name: "Binance", url: "https://www.binance.com" },
    { name: "Coinbase", url: "https://www.coinbase.com" },
    { name: "Crypto.com", url: "https://crypto.com" },
    { name: "Other", url: null },
  ];

  return (
    <section className="py-8 border-y border-border">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-primary mb-4">
          {t('pages.fraudsInvestigated')}
        </p>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {badges.map((badge, index) => (
            badge.url ? (
              <a
                key={index}
                href={badge.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-card rounded-lg border border-border text-foreground font-medium hover:bg-accent hover:border-primary transition-colors cursor-pointer"
              >
                {badge.name}
              </a>
            ) : (
              <div
                key={index}
                className="px-6 py-3 bg-card rounded-lg border border-border text-foreground font-medium"
              >
                {badge.name}
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  );
};

export default FraudBadges;
