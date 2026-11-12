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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const refreshRef = React.useRef(onRefresh);
  
  const threshold = 80;
  const maxPull = 120;

  React.useEffect(() => { refreshRef.current = onRefresh; }, [onRefresh]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let mounted = true;
    let start: { x: number; y: number } | null = null;
    let distance = 0;
    let refreshing = false;

    const updateDistance = (next: number) => {
      if (next === distance) return;
      distance = next;
      setPullDistance(next);
    };
    const isAtTop = (target: EventTarget | null) => {
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0) return false;
      // The page, or an inner list, may be scrolling rather than this wrapper.
      for (let element = target instanceof Element ? target : container; element; element = element.parentElement) {
        if (element.scrollTop > 0) return false;
      }
      return true;
    };
    const handleStart = (event: TouchEvent) => {
      if (refreshing || event.touches.length !== 1 || !isAtTop(event.target)) return;
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const handleMove = (event: TouchEvent) => {
      if (!start || refreshing) return;
      if (event.touches.length !== 1 || !isAtTop(event.target)) {
        start = null;
        updateDistance(0);
        return;
      }
      const dy = event.touches[0].clientY - start.y;
      const dx = event.touches[0].clientX - start.x;
      if (dy <= 0 || Math.abs(dx) > dy) {
        start = null;
        updateDistance(0);
        return;
      }
      if (event.cancelable) event.preventDefault();
      updateDistance(Math.min(dy * 0.5, maxPull));
    };
    const handleEnd = async () => {
      start = null;
      if (refreshing) return;
      if (distance < threshold) {
        updateDistance(0);
        return;
      }
      refreshing = true;
      setIsRefreshing(true);
      updateDistance(60);
      try {
        await refreshRef.current();
      } finally {
        refreshing = false;
        if (mounted) {
          setIsRefreshing(false);
          updateDistance(0);
        }
      }
    };
    const handleCancel = () => {
      start = null;
      if (!refreshing) updateDistance(0);
    };

    container.addEventListener('touchstart', handleStart, { passive: true });
    // Only an intentional pull at the top should prevent native scrolling.
    container.addEventListener('touchmove', handleMove, { passive: false });
    container.addEventListener('touchend', handleEnd);
    container.addEventListener('touchcancel', handleCancel);
    return () => {
      mounted = false;
      container.removeEventListener('touchstart', handleStart);
      container.removeEventListener('touchmove', handleMove);
      container.removeEventListener('touchend', handleEnd);
      container.removeEventListener('touchcancel', handleCancel);
    };
  }, []);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-x-hidden", className)}
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
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transitionDuration: pullDistance === 0 && !isRefreshing ? "200ms" : "0ms",
        }}
      >
        {children}
      </div>
    </div>
  );
}
