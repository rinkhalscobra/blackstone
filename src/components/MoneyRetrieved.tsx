import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, DollarSign, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
const MoneyRetrieved = () => {
  const {
    user
  } = useAuth();
  const {
    t
  } = useLanguage();
  return <section className="py-20 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">$54M+</div>
              <div className="text-muted-foreground">{t('moneyRetrieved.totalRecovered')}</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-success mb-2">$12.4K</div>
              <div className="text-muted-foreground">{t('moneyRetrieved.avgRecovery')}</div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold mb-2">4,350</div>
              <div className="text-muted-foreground">{t('moneyRetrieved.successfulCases')}</div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-card/50 backdrop-blur-sm rounded-2xl border border-border p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('moneyRetrieved.readyToRecover')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
              {t('moneyRetrieved.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? <Link to="/dashboard">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-lg px-8">
                    {t('moneyRetrieved.viewDashboard')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link> : <>
                  <Link to="/auth">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow text-lg px-8">
                      {t('moneyRetrieved.startConsultation')}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button size="lg" variant="outline" className="text-lg px-8">
                      {t('moneyRetrieved.contactTeam')}
                    </Button>
                  </Link>
                </>}
            </div>
            
            
          </div>
        </div>
      </div>
    </section>;
};
export default MoneyRetrieved;