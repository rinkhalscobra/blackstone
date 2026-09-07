import { Link } from 'react-router-dom';
import BrandMark from '@/components/BrandMark';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

const sizeConfig = {
  sm: 'w-20 h-10 sm:w-24 sm:h-16',
  md: 'w-28 h-12 sm:w-32 sm:h-24',
  lg: 'w-36 h-16 sm:w-40 sm:h-28',
};

export const Logo = ({ size = 'md', linkTo = '/' }: LogoProps) => {
  const content = <BrandMark className={`${sizeConfig[size]} shrink-0`} />;

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex shrink-0 items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
