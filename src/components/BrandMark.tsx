interface BrandMarkProps {
  className?: string;
}

/** Use the supplied artwork unchanged across public and account layouts. */
const BrandMark = ({ className = "h-20 w-28 sm:h-24 sm:w-32" }: BrandMarkProps) => (
  <img
    src="/logo2.png"
    alt="Crest Financial"
    className={`object-contain ${className}`}
    decoding="async"
    draggable={false}
  />
);

export default BrandMark;
