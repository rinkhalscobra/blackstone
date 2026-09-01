import { motion } from "framer-motion";
import CryptoTicker from "@/components/CryptoTicker";
import CryptoStats from "@/components/CryptoStats";
import CryptoChart from "@/components/CryptoChart";
import CryptoTable from "@/components/CryptoTable";
import { SectionEyebrow, gradientStyle } from "@/components/showcase/primitives";

const ease = [0.22, 1, 0.36, 1] as const;

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_32px_hsl(220_40%_2%/0.45),inset_0_1px_0_hsl(0_0%_100%/0.06)] overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const MarketBand = () => {
  return (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="flex flex-col items-center text-center mb-14"
        >
          <SectionEyebrow label="Live market" tag="Real time" />
          <h2 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight leading-[0.95]">
            <span className="block text-white">Live market.</span>
            <span className="block animate-shiny" style={gradientStyle}>
              Real signal.
            </span>
          </h2>
          <p className="mt-6 text-white/60 max-w-lg text-base leading-[1.5]">
            Every case starts with the truth on-chain. Track prices, spot momentum, and see the same
            data our recovery agents work with.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
        >
          <Panel className="mb-8">
            <CryptoTicker />
          </Panel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease, delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <Panel className="p-2">
            <CryptoChart symbol="BTC/USD" title="Bitcoin (BTC)" />
          </Panel>
          <Panel className="p-2">
            <CryptoChart symbol="ETH/USD" title="Ethereum (ETH)" />
          </Panel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
        >
          <Panel className="mb-8">
            <CryptoStats />
          </Panel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease, delay: 0.15 }}
        >
          <Panel>
            <CryptoTable />
          </Panel>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketBand;
