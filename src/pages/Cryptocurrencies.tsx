import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CryptoTable from "@/components/CryptoTable";
import CryptoTicker from "@/components/CryptoTicker";
import CryptoChart from "@/components/CryptoChart";
import CryptoSearch from "@/components/CryptoSearch";
import { useLanguage } from "@/contexts/LanguageContext";

const Cryptocurrencies = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <CryptoTicker className="mt-16" />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{t('crypto.topCryptocurrencies')}</h1>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            {t('crypto.cryptoDescription')}
          </p>
          
          {/* Search Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">{t('crypto.searchCryptocurrencies')}</h2>
            <CryptoSearch className="max-w-xl" />
          </div>
          
          {/* Charts Section - supported cryptocurrencies */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CryptoChart symbol="BTC/USD" title="Bitcoin (BTC)" />
            <CryptoChart symbol="ETH/USD" title="Ethereum (ETH)" />
            <CryptoChart symbol="SOL/USD" title="Solana (SOL)" />
            <CryptoChart symbol="XRP/USD" title="XRP (XRP)" />
            <CryptoChart symbol="USDT/USD" title="Tether (USDT)" />
          </div>
          
          <CryptoTable />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cryptocurrencies;
