import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const Hero = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-primary/15 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{t('hero.badge')}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            {t('hero.title')}{' '}
            <span className="text-shiny animate-shiny">{t('hero.cryptoScam')}</span>
            <br />
            <span className="text-3xl md:text-4xl text-muted-foreground font-normal">{t('hero.subtitle')}</span>
          </h1>

          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-lg px-8 py-6">
                  {t('hero.goToDashboard')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-lg px-8 py-6">
                    {t('hero.startYourCase')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-secondary">
                    {t('hero.loginToDashboard')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border p-4">
              <Users className="h-8 w-8 text-primary" />
              <div className="text-left">
                <div className="text-2xl font-bold">10K+</div>
                <div className="text-sm text-muted-foreground">{t('hero.casesHandled')}</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border p-4">
              <CheckCircle className="h-8 w-8 text-success" />
              <div className="text-left">
                <div className="text-2xl font-bold">78%</div>
                <div className="text-sm text-muted-foreground">{t('hero.successRate')}</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl border border-border p-4">
              <Clock className="h-8 w-8 text-primary" />
              <div className="text-left">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-sm text-muted-foreground">{t('hero.expertSupport')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
