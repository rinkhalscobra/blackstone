import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, Search, ShieldCheck } from "lucide-react";
import ShowcaseNav from "@/components/showcase/ShowcaseNav";
import AppMockup from "@/components/showcase/AppMockup";
import FraudPanel from "@/components/showcase/FraudPanel";
import LogoCloud from "@/components/showcase/LogoCloud";
import Testimonials from "@/components/showcase/Testimonials";
import FinalCTA from "@/components/showcase/FinalCTA";
import TrustpilotBadge from "@/components/showcase/TrustpilotBadge";
import MarketBand from "@/components/showcase/MarketBand";
import Footer from "@/components/Footer";
import { gradientStyle } from "@/components/showcase/primitives";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/showcase.css";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4";

const menuItems = ["File", "Edit", "View", "Go", "Window", "Help"];

const useNowLondon = () => {
  const [s, setS] = useState("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/London",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const tick = () => setS(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return s;
};

const Index = () => {
  const now = useNowLondon();
  const { user } = useAuth();
  const { t } = useLanguage();

  const ctaHref = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? t("hero.goToDashboard") : t("hero.startYourCase");

  return (
    <div className="showcase-root relative min-h-screen overflow-x-hidden bg-[#08111f] text-white">
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

      {/* Fullscreen background video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08111f]/70 via-[#08111f]/60 to-[#08111f]" />
      </div>

      {/* Guide lines */}
      <div className="hidden md:block fixed inset-y-0 left-1/2 -translate-x-[36rem] w-px bg-white/5 z-0 pointer-events-none" />
      <div className="hidden md:block fixed inset-y-0 left-1/2 translate-x-[36rem] w-px bg-white/5 z-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <ShowcaseNav />

        {/* Hero */}
        <section className="pt-16 md:pt-28 pb-20 text-center flex flex-col items-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
          >
            <span className="block text-white">{t("hero.title")}</span>
            <span className="block animate-shiny" style={gradientStyle}>
              {t("hero.cryptoScam")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-8 text-white/60 max-w-md text-base leading-[1.5]"
          >
            {t("hero.description")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <Link
              to={ctaHref}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{ctaLabel}</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
            </Link>
            <div className="text-xs text-white/40">
              10K+ {t("hero.casesHandled")} · 78% {t("hero.successRate")}
            </div>
            <TrustpilotBadge />
          </motion.div>
        </section>

        {/* macOS bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="w-full h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
        >
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-white font-bold">BlackStone Recovery</span>
              {menuItems.map((m, i) => (
                <span
                  key={m}
                  className={`text-white/70 ${i > 2 ? "hidden sm:inline" : ""} ${i > 3 ? "hidden md:inline" : ""}`}
                >
                  {m}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <Search className="w-3.5 h-3.5" />
              <span>{now}</span>
            </div>
          </div>
        </motion.div>

        <AppMockup />
        <FraudPanel />
        <MarketBand />
        <LogoCloud />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
