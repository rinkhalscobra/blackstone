import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import Logo from "@/components/Logo";
import { AppleButton } from "./primitives";

const links = [
  { label: "Recovery", target: "recovery" },
  { label: "Portfolio", target: "portfolio" },
  { label: "Cases", target: "cases" },
  { label: "Pricing", target: "pricing" },
  { label: "Contact", target: "contact" },
];

const ShowcaseNav = () => (
  <motion.header
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="sticky top-0 z-50 w-full px-3 pt-3"
  >
    <nav
      className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/90 px-4 py-3 shadow-[0_16px_50px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center justify-between"
      aria-label="Main navigation"
    >
      <Logo size="md" />

      <div className="hidden md:flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
        {links.map(({ label, target }, i) => (
          <motion.a
            key={target}
            href={`#${target}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
            className="rounded-lg px-3 py-2 text-white/60 text-sm font-medium hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            {label}
          </motion.a>
        ))}
      </div>

      <div className="hidden md:block">
        <AppleButton label="Start your case" />
      </div>

      <button
        className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white"
        aria-label="Menu"
      >
        <Menu className="w-4 h-4" />
      </button>
    </nav>
  </motion.header>
);

export default ShowcaseNav;
