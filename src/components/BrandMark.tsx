interface BrandMarkProps {
  className?: string;
}

/** Use the supplied artwork unchanged across public and account layouts. */
const BrandMark = ({ className = "h-24 w-24" }: BrandMarkProps) => (
  <img
    src="/logo2.png"
    alt="Crest Financial"
    width={1254}
    height={1254}
    className={`object-contain ${className}`}
    decoding="async"
    draggable={false}
  />
);

export default BrandMark;
