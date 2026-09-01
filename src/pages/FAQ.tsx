import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

const FAQ = () => {
  const { t } = useLanguage();

  const faqs = [
    { questionKey: "faq.q1", answerKey: "faq.a1" },
    { questionKey: "faq.q2", answerKey: "faq.a2" },
    { questionKey: "faq.q3", answerKey: "faq.a3" },
    { questionKey: "faq.q4", answerKey: "faq.a4" },
    { questionKey: "faq.q5", answerKey: "faq.a5" },
    { questionKey: "faq.q6", answerKey: "faq.a6" },
    { questionKey: "faq.q7", answerKey: "faq.a7" },
    { questionKey: "faq.q8", answerKey: "faq.a8" },
    { questionKey: "faq.q9", answerKey: "faq.a9" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="pt-8 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 text-center">
              <span className="text-primary">{t('faq.title')}</span>
            </h1>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('faq.subtitle')}
            </p>

            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-primary border-primary rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-4 text-left text-card hover:no-underline">
                    {t(faq.questionKey)}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 bg-card text-muted-foreground border-t border-border">
                    {t(faq.answerKey)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                {t('faq.stillHaveQuestions')}
              </p>
              <p className="text-muted-foreground">
                {t('faq.contactPrompt')}{" "}
                <Link to="/contact" className="text-primary hover:underline">{t('faq.contactUs')}</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
