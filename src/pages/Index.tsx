import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Fingerprint, ScanSearch, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import AppMockup from "@/components/showcase/AppMockup";
import FraudPanel from "@/components/showcase/FraudPanel";
import LogoCloud from "@/components/showcase/LogoCloud";
import Testimonials from "@/components/showcase/Testimonials";
import PricingBlock from "@/components/showcase/PricingBlock";
import FinalCTA from "@/components/showcase/FinalCTA";
import TrustpilotBadge from "@/components/showcase/TrustpilotBadge";
import MarketBand from "@/components/showcase/MarketBand";
import Footer from "@/components/Footer";
import { gradientStyle } from "@/components/showcase/primitives";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/showcase.css";

const proofItems = [
  { value: "$54M+", label: "assets traced" },
  { value: "10K+", label: "cases reviewed" },
  { value: "78%", label: "successful outcomes" },
  { value: "24/7", label: "case monitoring" },
];

const Index = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const ctaHref = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? t("hero.goToDashboard") : t("hero.startYourCase");

  return (
    <div className="showcase-root relative min-h-screen overflow-x-hidden bg-black text-white">
      {/* Global noise filter */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="c3-noise-root">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.25 0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.25 0" />
          <feComposite in2="SourceGraphic" operator="in" />
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </svg>

      {/* Lightweight animated background */}
      <div className="showcase-background fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="showcase-particle" />
        ))}
      </div>

      {/* Guide lines */}
      <div className="hidden md:block fixed inset-y-0 left-1/2 -translate-x-[36rem] w-px bg-white/5 z-0 pointer-events-none" />
      <div className="hidden md:block fixed inset-y-0 left-1/2 translate-x-[36rem] w-px bg-white/5 z-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <Navigation landing />

        {/* Split hero */}
        <section
          id="recovery"
          className="showcase-anchor max-w-6xl mx-auto px-6 pt-28 pb-14 md:pt-36 md:pb-20 grid lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-16 items-center"
        >
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              <Fingerprint className="h-3.5 w-3.5" />
              Digital asset recovery
            </div>

            <h1 className="mt-7 text-5xl md:text-7xl font-semibold tracking-[-0.055em] leading-[0.94]">
              <span className="block text-white">{t("hero.title")}</span>
              <span className="block animate-shiny" style={gradientStyle}>
                {t("hero.cryptoScam")}
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base md:text-lg leading-relaxed text-white/55">
              {t("hero.description")}
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                to={ctaHref}
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition-all hover:bg-neutral-200 active:scale-[0.98]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{ctaLabel}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#cases"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-5 py-3.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                See how it works
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-xs text-white/40">
              <TrustpilotBadge />
              <span className="hidden h-8 w-px bg-white/10 sm:block" />
              <span>Free review · No obligation</span>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#0a0a0a]/90 p-5 md:p-7 shadow-[0_30px_80px_-35px_rgba(255,255,255,0.18)]"
          >
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">Case intelligence</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Recovery outlook</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Live
              </span>
            </div>

            <div className="relative mt-8 grid grid-cols-[auto_1fr] items-center gap-7">
              <div
                className="grid h-32 w-32 place-items-center rounded-full p-[9px]"
                style={{ background: "conic-gradient(#ffffff 0 78%, rgba(255,255,255,0.1) 78% 100%)" }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-[#0a0a0a] text-center">
                  <div>
                    <div className="text-3xl font-semibold text-white">78%</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/35">success rate</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight text-white">$54M+</div>
                <p className="mt-1 text-sm leading-relaxed text-white/45">Assets recovered through forensic tracing and coordinated action.</p>
              </div>
            </div>

            <div className="relative mt-8 space-y-2">
              {[
                ["Wallet trace", "Complete"],
                ["Exchange coordination", "In progress"],
                ["Legal evidence pack", "Ready"],
              ].map(([label, status], index) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
                  {index === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <ScanSearch className="h-4 w-4 text-white/65" />
                  )}
                  <span className="flex-1 text-sm text-white/70">{label}</span>
                  <span className="text-[11px] text-white/35">{status}</span>
                </div>
              ))}
            </div>
          </motion.aside>
        </section>

        {/* Proof strip */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="max-w-6xl mx-auto px-6 pb-8"
          aria-label="Recovery results"
        >
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm md:grid-cols-4">
            {proofItems.map((item, index) => (
              <div
                key={item.label}
                className={`px-5 py-5 md:px-7 ${index % 2 ? "border-l border-white/10" : ""} ${index > 1 ? "border-t border-white/10 md:border-t-0" : ""} ${index > 1 ? "md:border-l" : ""}`}
              >
                <div className="text-xl font-semibold text-white">{item.value}</div>
                <div className="mt-1 text-xs text-white/40">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        <AppMockup />
        <FraudPanel />
        <MarketBand />
        <LogoCloud />
        <Testimonials />
        <PricingBlock />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
