import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WindowChromeProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * macOS-style window frame used by authenticated app shells.
 * Purely presentational: traffic-light dots on the left, centered title.
 */
export const WindowChrome = ({ title = 'Blackstone Recovery', children, className }: WindowChromeProps) => {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/10 bg-background/60 backdrop-blur-2xl',
        'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'overflow-hidden',
        className,
      )}
    >
      {/* Title bar */}
      <div className="relative flex items-center h-9 px-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]" />
        </div>
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <span className="text-[12px] font-medium text-muted-foreground tracking-tight">{title}</span>
        </div>
      </div>
      {children}
    </div>
  );
};

export default WindowChrome;
