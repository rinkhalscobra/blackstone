import * as React from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      e.preventDefault();
      setPullDistance(Math.min(diff * 0.5, maxPull));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 z-50 transition-opacity duration-200 flex items-center justify-center",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(pullDistance - 50, 8),
        }}
      >
        <div className="bg-card border border-border rounded-full p-2 shadow-lg">
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={cn(
                "h-5 w-5 text-primary transition-transform duration-200",
                progress >= 1 && "rotate-180"
              )}
              style={{
                transform: `rotate(${progress * 180}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: pullDistance === 0 && !isRefreshing ? "200ms" : "0ms",
        }}
      >
        {children}
      </div>
    </div>
  );
}
