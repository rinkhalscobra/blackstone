import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AppleButton } from "./primitives";

const FinalCTA = () => (
  <section className="max-w-6xl mx-auto px-6 py-20 md:py-32 relative z-10">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(600px circle at 50% 0%, rgba(251,191,36,0.18), transparent 70%)",
          opacity: 0.9,
        }}
      />
      <div className="relative">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-white">
          Stop counting the loss.
          <br />
          Start the recovery.
        </h2>
        <p className="mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
          Join thousands of victims who turned a total loss into a case with an outcome. Free consultation, no obligation.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <AppleButton label="Start your case" />
          <button className="group inline-flex items-center gap-1 rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3 hover:bg-white/5 transition-colors">
            Talk to an agent
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
          </button>
        </div>
      </div>
    </motion.div>
  </section>
);

export default FinalCTA;
