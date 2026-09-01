import { Star, Shield, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const testimonials = [
  {
    id: 1,
    quote: "I lost $87,000 to a sophisticated investment scam. Within 6 months, the team recovered 94% of my funds. I'm forever grateful.",
    amount: 81780,
    scamType: "Investment Fraud",
    client: "M.R.",
    rating: 5,
    location: "California, USA"
  },
  {
    id: 2,
    quote: "After falling victim to a romance scam, I thought my savings were gone forever. They traced my cryptocurrency and got back $45,000.",
    amount: 45000,
    scamType: "Romance Scam",
    client: "S.K.",
    rating: 5,
    location: "London, UK"
  },
  {
    id: 3,
    quote: "A phishing attack drained my crypto wallet. The forensics team tracked the funds across multiple wallets and recovered everything.",
    amount: 23500,
    scamType: "Phishing Attack",
    client: "J.D.",
    rating: 5,
    location: "Toronto, Canada"
  },
  {
    id: 4,
    quote: "I was skeptical at first, but they delivered. Professional, transparent, and effective. Got 89% of my lost funds back.",
    amount: 156000,
    scamType: "Crypto Exchange Scam",
    client: "A.T.",
    rating: 5,
    location: "Sydney, Australia"
  },
  {
    id: 5,
    quote: "The team handled my case with complete professionalism. They recovered funds I had completely written off. Highly recommend.",
    amount: 34200,
    scamType: "NFT Fraud",
    client: "L.M.",
    rating: 5,
    location: "Berlin, Germany"
  }
];

const Testimonials = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
            <Shield className="w-3 h-3 mr-1" />
            {t('testimonials.badge')}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('testimonials.title')} <span className="text-primary">{t('testimonials.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('testimonials.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((testimonial) => (
            <Card 
              key={testimonial.id} 
              className="bg-card/50 border-border/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-primary/30 mb-3" />
                
                <p className="text-foreground/90 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                <div className="border-t border-border/50 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{testimonial.client}</span>
                    <Badge className="bg-success/20 text-success border-0">
                      ${testimonial.amount.toLocaleString()} {t('testimonials.recovered')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{testimonial.location}</span>
                    <Badge variant="outline" className="text-xs border-border">
                      {testimonial.scamType}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats row */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-6 rounded-lg bg-card/30 border border-border/30">
            <p className="text-3xl font-bold text-primary">98%</p>
            <p className="text-sm text-muted-foreground">{t('testimonials.successRateStat')}</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card/30 border border-border/30">
            <p className="text-3xl font-bold text-primary">$47M+</p>
            <p className="text-sm text-muted-foreground">{t('testimonials.totalRecovered')}</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card/30 border border-border/30">
            <p className="text-3xl font-bold text-primary">2,500+</p>
            <p className="text-sm text-muted-foreground">{t('testimonials.happyClients')}</p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card/30 border border-border/30">
            <p className="text-3xl font-bold text-primary">45 Days</p>
            <p className="text-sm text-muted-foreground">{t('testimonials.avgRecoveryTime')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
