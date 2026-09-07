import { PublicLayout } from '@/components/public/PublicLayout';
import RecoveryHero from '@/components/showcase/RecoveryHero';
import {
  LocatedFundsSection,
  CaseTypesSection,
  CapabilitiesSection,
  MarketSection,
  ClientCareSection,
  PricingSection,
  ContactSection,
} from '@/components/public/PublicSections';

const Index = () => (
  <PublicLayout>
    <RecoveryHero />
    <LocatedFundsSection />
    <CaseTypesSection />
    <CapabilitiesSection />
    <MarketSection />
    <ClientCareSection />
    <PricingSection />
    <ContactSection />
  </PublicLayout>
);

export default Index;
