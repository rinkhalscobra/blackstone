import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";

const Categories = () => {
  const { t } = useLanguage();

  const categories = [
    { name: "Binance Ecosystem", change: "+1.04%", tokens: 732, marketCap: "€3,529,411,687,247", volume: "€400,976,705,432" },
    { name: "Layer 1", change: "-2.84%", tokens: 132, marketCap: "€2,947,764,148,397", volume: "€155,190,365,438" },
    { name: "FTX Bankruptcy Estate", change: "+2.91%", tokens: 26, marketCap: "€2,883,274,596,137", volume: "€151,438,287,240" },
    { name: "US Strategic Crypto Reserve", change: "-2.94%", tokens: 5, marketCap: "€2,851,574,494,197", volume: "€148,912,791,876" },
    { name: "Alameda Research Portfolio", change: "-2.89%", tokens: 61, marketCap: "€2,788,333,608,840", volume: "€144,542,783,295" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">{t('pages.categoriesTitle')}</h1>
          <p className="text-muted-foreground mb-8 max-w-3xl">
            {t('pages.categoriesDescription')}
          </p>
          
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">{t('crypto.name')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('pages.avgPriceChange')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('pages.nrTokens')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('crypto.marketCap')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('pages.volume24h')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <TableRow key={index} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className={category.change.startsWith('+') ? 'text-success' : 'text-destructive'}>
                      {category.change}
                    </TableCell>
                    <TableCell>{category.tokens}</TableCell>
                    <TableCell>{category.marketCap}</TableCell>
                    <TableCell>{category.volume}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
