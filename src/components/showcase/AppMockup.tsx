import { motion } from "framer-motion";
import {
  Archive,
  FileText,
  Folder,
  MoreHorizontal,
  Paperclip,
  Reply,
  Forward,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  Eye,
  History,
  Briefcase,
} from "lucide-react";

const navItems = [
  { icon: Wallet, label: "Portfolio", count: 5, active: false },
  { icon: Eye, label: "Watchlist", count: 3 },
  { icon: Briefcase, label: "Cases", count: 2, active: true },
  { icon: History, label: "Transactions" },
  { icon: FileText, label: "Documents" },
  { icon: Archive, label: "Archive" },
];

const cases = [
  { from: "Exchange Response Desk", subject: "Exchange scam · BTC", preview: "Trace complete on 3 wallets. Freeze requested via VASP…", time: "9:41 AM", unread: true, active: true, amount: "€48,200" },
  { from: "Case BR-1842", subject: "Phishing wallet · ETH", preview: "Attacker moved funds through Tornado mixer. New leads…", time: "8:12 AM", unread: true, amount: "€12,480" },
  { from: "Nova Token Case", subject: "Rug pull — Nova token", preview: "Legal filing prepared for jurisdiction transfer.", time: "Yesterday", amount: "€8,900" },
  { from: "Case BR-2207", subject: "Romance scam · USDT", preview: "Victim statement collected. Awaiting chain trace review.", time: "Yesterday", amount: "€22,100" },
  { from: "Forensics Unit", subject: "Wallet cluster report", preview: "6 addresses tagged as high-risk mixer output.", time: "Mon", amount: "€6,300" },
  { from: "Case BR-0931", subject: "Impersonation · SOL", preview: "Exchange KYC pull confirms recipient identity.", time: "Mon", amount: "€3,750" },
];

const labels = [
  { name: "BTC", color: "#ffffff" },
  { name: "ETH", color: "#d4d4d4" },
  { name: "USDT", color: "#a3a3a3" },
  { name: "SOL", color: "#737373" },
];

const AppMockup = () => (
  <motion.div
    id="portfolio"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    className="showcase-anchor max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10"
  >
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#090909]/90 backdrop-blur-2xl shadow-[0_40px_120px_-20px_rgba(255,255,255,0.12)]">
      {/* Title bar */}
      <div className="h-9 border-b border-white/10 flex items-center px-4 relative bg-black/40">
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-white/55" />
          <span className="w-3 h-3 rounded-full bg-white/35" />
          <span className="w-3 h-3 rounded-full bg-white/20" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 text-xs text-white/50">BlackStone Recovery — Case Center</span>
      </div>

      <div className="grid grid-cols-12 h-[520px]">
        {/* Sidebar */}
        <div className="col-span-3 border-r border-white/10 bg-black/30 p-4 flex flex-col gap-4">
          <button className="rounded-lg bg-white text-black text-xs font-semibold px-3 py-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            New recovery case
          </button>
          <div className="flex flex-col gap-0.5 text-sm">
            {navItems.map(({ icon: Icon, label, count, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1">{label}</span>
                {count && <span className="text-[10px] text-white/40">{count}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2 px-2.5">Labels</div>
            <div className="flex flex-col gap-1">
              {labels.map((l) => (
                <div key={l.name} className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-white/70">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case list */}
        <div className="col-span-4 border-r border-white/10 flex flex-col">
          <div className="h-10 px-3 border-b border-white/10 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-white/40" />
            <input readOnly value="Search cases" className="bg-transparent text-xs text-white/60 outline-none w-full" />
          </div>
          <div className="flex-1 overflow-hidden">
            {cases.map((c, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 border-b border-white/5 cursor-pointer ${c.active ? "bg-white/[0.04]" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {c.unread && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  <span className="text-xs font-semibold text-white truncate flex-1">{c.from}</span>
                  <span className="text-[10px] text-white/40">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[11px] text-white/80 truncate">{c.subject}</span>
                  <span className="text-[10px] font-semibold text-white">{c.amount}</span>
                </div>
                <div className="text-[10px] text-white/40 truncate">{c.preview}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reader */}
        <div className="col-span-5 flex flex-col">
          <div className="h-10 px-3 border-b border-white/10 flex items-center gap-1">
            {[Reply, Forward, Archive, Trash2].map((Icon, i) => (
              <button key={i} className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-white/70">
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
            <div className="ml-auto">
              <button className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center text-white/70">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-5">
            <h3 className="text-base font-semibold text-white mb-3">Exchange scam · BTC recovery</h3>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white to-neutral-600 flex items-center justify-center text-[11px] font-bold text-black">
                R
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-white">Recovery Team</div>
                <div className="text-[10px] text-white/40">to you · 9:41 AM</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20 font-medium">
                Phase 3 · Legal
              </span>
            </div>

            <div className="liquid-glass rounded-xl p-3 mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white/80" />
                <span className="text-[11px] font-semibold text-white">Summary by BlackStone Recovery AI</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                On-chain trace complete across 3 clusters. Funds routed via a licensed VASP — freeze request filed. Estimated recovery: 68%. No further action required from you.
              </p>
            </div>

            <div className="space-y-2 text-[11px] text-white/70 leading-relaxed">
              <p>Hello,</p>
              <p>
                We finalized the chain-of-custody report on the 1.42 BTC transferred out of your exchange account on May 3.
                All three destination clusters have been mapped and forwarded to our legal partners in the UK and Luxembourg.
              </p>
              <p>
                Two of the three receiving wallets were cashed out through a compliant exchange — our freeze request is
                filed and expected to be processed within 72 hours.
              </p>
              <p className="text-white/50">— The BlackStone Recovery Team</p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-[11px] text-white/70">
              <Paperclip className="w-3 h-3" />
              case-file-24601.pdf
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default AppMockup;
