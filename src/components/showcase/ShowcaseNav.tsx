import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { AppleButton, LogoMark } from "./primitives";

const links = ["Recovery", "Portfolio", "Cases", "Pricing", "Contact"];

const ShowcaseNav = () => (
  <motion.nav
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="max-w-6xl mx-auto px-6 flex items-center justify-between pt-6"
  >
    <LogoMark className="w-8 h-8" />

    <div className="hidden md:flex gap-8">
      {links.map((l, i) => (
        <motion.a
          key={l}
          href="#"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, duration: 0.5 }}
          className="text-white/70 text-sm font-medium hover:text-white transition-colors"
        >
          {l}
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
  </motion.nav>
);

export default ShowcaseNav;
