import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/showcase/primitives';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
}

const sizeConfig = {
  sm: { icon: 'w-7 h-7', text: 'text-lg' },
  md: { icon: 'w-9 h-9', text: 'text-xl' },
  lg: { icon: 'w-11 h-11', text: 'text-2xl' },
};

export const Logo = ({ size = 'md', showText = true, linkTo = '/' }: LogoProps) => {
  const config = sizeConfig[size];

  const content = (
    <div className="flex items-center gap-2.5">
      <LogoMark className={`${config.icon} shrink-0`} />
      {showText && (
        <span
          className={`font-bold tracking-tight ${config.text}`}
          style={{
            backgroundImage: 'linear-gradient(90deg, #ffffff 0%, #ffffff 55%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          BlackStone Recovery
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
