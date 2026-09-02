interface BrandMarkProps {
  className?: string;
}

/** BlackStone Recovery black tile with a white B monogram. */
const BrandMark = ({ className = "h-9 w-9" }: BrandMarkProps) => (
  <svg viewBox="0 0 40 40" className={className} role="img" aria-label="BlackStone Recovery">
    <rect x="2.5" y="2.5" width="35" height="35" rx="10" fill="#000000" stroke="#ffffff" strokeOpacity="0.2" />
    <path
      fill="#ffffff"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11 8h10c5.1 0 8 2.5 8 6.8 0 2.5-1.2 4.3-3.4 5.3 2.8.9 4.4 2.9 4.4 5.7 0 4.2-3.2 6.2-8.8 6.2H11V8Zm5 4v6h4.5c2.3 0 3.5-1 3.5-3s-1.3-3-3.5-3H16Zm0 10v6h5c2.6 0 4-1 4-3s-1.4-3-4-3h-5Z"
    />
  </svg>
);

export default BrandMark;
