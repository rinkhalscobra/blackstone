import { motion } from "framer-motion";
import { SectionEyebrow } from "./primitives";

const chips = ["On-chain forensics", "Exchange partners", "Wallet risk scoring", "Instant freeze requests"];

const buckets = [
  {
    name: "Critical",
    count: 4,
    color: "#ffffff",
    items: ["0x7a3f… — mixer output", "bc1q9k… — sanctioned entity"],
  },
  {
    name: "Suspicious",
    count: 7,
    color: "#e5e5e5",
    items: ["0x21ab… — chain hopping", "0x4f8c… — new counterparty"],
  },
  {
    name: "Monitoring",
    count: 18,
    color: "#a3a3a3",
    items: ["bc1qxy… — dormant", "0x93ee… — low volume"],
  },
  {
    name: "Cleared",
    count: 13,
    color: "#525252",
    items: ["Verified VASP · Custodial wallets · KYC-linked"],
  },
];

const FraudPanel = () => (
  <section id="cases" className="showcase-anchor max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
    <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <SectionEyebrow label="Detection" tag="AI-native" />
        <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02] text-white">
          Spot the scam
          <br />
          before it drains you.
        </h2>
        <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
          BrightFund Recovery watches every wallet, cross-references it against known scam clusters, and flags risk in seconds.
          Chain-of-custody evidence is built automatically — ready for exchanges, banks, and law enforcement.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
            >
              {c}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="liquid-glass rounded-2xl p-5"
      >
        <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Today · 42 wallets analyzed</div>
        <div className="grid grid-cols-2 gap-3">
          {buckets.map((b) => (
            <div key={b.name} className="liquid-glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  <span className="text-xs font-semibold text-white">{b.name}</span>
                </div>
                <span className="text-[10px] text-white/40">({b.count})</span>
              </div>
              <div className="space-y-1">
                {b.items.map((it) => (
                  <div key={it} className="text-[10px] text-white/60 truncate">
                    {it}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default FraudPanel;
