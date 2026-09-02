import { ChevronRight, ShieldCheck } from "lucide-react";

export const LogoMark = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="scLogoFill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#262626" />
        <stop offset="55%" stopColor="#525252" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>
      <linearGradient id="scLogoStroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#d4d4d4" />
        <stop offset="100%" stopColor="#737373" />
      </linearGradient>
      <linearGradient id="scLogoGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="scLogoGlow" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Rounded square base */}
    <rect x="4" y="4" width="32" height="32" rx="9" fill="url(#scLogoFill)" />
    <rect x="4" y="4" width="32" height="32" rx="9" fill="url(#scLogoGlow)" />
    <rect x="4.75" y="4.75" width="30.5" height="30.5" rx="8.25" fill="none" stroke="url(#scLogoStroke)" strokeWidth="0.9" opacity="0.9" />
    {/* Gloss highlight */}
    <path d="M6 8 Q20 4 34 8 L34 18 Q20 14 6 18 Z" fill="url(#scLogoGloss)" />
    {/* Monogram E */}
    <path
      d="M14.5 12 H26.5 M14.5 12 V28 M14.5 20 H23.5 M14.5 28 H26.5"
      fill="none"
      stroke="url(#scLogoStroke)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Accent dot */}
    <circle cx="29" cy="11" r="1.5" fill="url(#scLogoStroke)" />
  </svg>
);

export const AppleButton = ({ label = "Start your case", full = false }: { label?: string; full?: boolean }) => (
  <button
    className={`group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98] ${full ? "w-full" : ""}`}
  >
    <ShieldCheck className="w-4 h-4" />
    <span>{label}</span>
    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
  </button>
);

export const SectionEyebrow = ({ label, tag }: { label: string; tag?: string }) => (
  <div className="inline-flex items-center gap-3 text-xs uppercase tracking-widest text-white/50">
    <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
    <span>{label}</span>
    {tag && (
      <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50 normal-case tracking-normal">
        {tag}
      </span>
    )}
  </div>
);

export const gradientStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, #737373 0%, #d4d4d4 15%, #ffffff 35%, #a3a3a3 50%, #ffffff 65%, #d4d4d4 85%, #737373 100%)",
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  filter: "url(#c3-noise)",
};
