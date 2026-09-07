interface BrandMarkProps {
  className?: string;
}

/** Crest Financial monogram, shared with the browser icon and social artwork. */
const BrandMark = ({ className = "h-9 w-9" }: BrandMarkProps) => (
  <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Crest Financial">
    <rect x="2.5" y="2.5" width="35" height="35" rx="10" fill="#101813" stroke="#dce7df" strokeOpacity="0.3" />
    <path
      fill="none"
      stroke="#edf2ee"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 13.5a8 8 0 1 0 0 13M24 28V12h7M24 19h6"
    />
  </svg>
);

export default BrandMark;
