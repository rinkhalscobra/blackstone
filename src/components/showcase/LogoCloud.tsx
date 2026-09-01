import { motion } from "framer-motion";

const partners = ["Binance", "Coinbase", "Kraken", "Crypto.com", "Chainalysis", "Elliptic", "Interpol", "Europol"];

const LogoCloud = () => (
  <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 relative z-10">
    <div className="text-center text-xs uppercase tracking-widest text-white/40">
      Trusted by partners across the recovery ecosystem
    </div>
    <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
      {partners.map((p, i) => (
        <motion.div
          key={p}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.5 }}
          className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors text-center"
        >
          {p}
        </motion.div>
      ))}
    </div>
  </section>
);

export default LogoCloud;
