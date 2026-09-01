import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ResponsiveTableWrapper({ 
  children, 
  className,
  ...props 
}: ResponsiveTableWrapperProps) {
  return (
    <div 
      className={cn(
        "w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",
        className
      )}
      {...props}
    >
      <div className="min-w-[640px]">
        {children}
      </div>
    </div>
  );
}
