import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Phone, Mail, Copy, MapPin, BookOpen, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('common.copied'),
      description: `${type} ${t('common.copiedToClipboard')}`,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-12 text-center">{t('contact.title')}</h1>

            <div className="space-y-6">
              <Card className="bg-card border-border p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Phone className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">{t('common.phone').toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono">+44 7441 429776</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard("+44 7441 429776", t('common.phone'))}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </Card>

              <Card className="bg-card border-border p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">{t('common.email').toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-mono">support@exloss.com</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard("support@exloss.com", t('common.email'))}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </Card>

              <Card className="bg-card border-border p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">ADDRESS</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <address className="text-xl font-mono not-italic">63 Rue de Bouillon, L-1248 Luxembourg</address>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard("63 Rue de Bouillon, L-1248 Luxembourg", "Address")}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </Card>

              <Card className="bg-card border-border p-8">
                <div className="flex items-center gap-3 mb-6">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">IDENTIFICATION DATA</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Registration number</span>
                    </div>
                    <span className="text-lg font-mono">B 146.532</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Local Court</span>
                    </div>
                    <span className="text-lg font-mono">2080 Luxembourg</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground">
                {t('contact.responseTime')}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
