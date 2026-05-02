/**
 * @file Logo.tsx
 * @description StudyOps Branding Component.
 * Implements the saffron-themed identity from the design system.
 * 
 * @author Study Ops Engineering
 */

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * StudyOps Logo Component.
 */
export function Logo({ className, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { mark: 'w-8 h-8 text-base', text: 'text-lg', sub: 'hidden' },
    md: { mark: 'w-11 h-11 text-2xl', text: 'text-2xl', sub: 'block' },
    lg: { mark: 'w-14 h-14 text-3xl', text: 'text-4xl', sub: 'block' },
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className={cn(
        "bg-saffron rounded-[10px] flex items-center justify-center font-display text-navy shrink-0",
        sizes[size].mark
      )}>
        S
      </div>
      <div className="flex flex-col -gap-1">
        <h1 className={cn("font-display text-white leading-tight", sizes[size].text)}>
          Study<span className="text-saffron">Ops</span>
        </h1>
        {size !== 'sm' && (
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em] opacity-60">
            Shift-aware exam intelligence
          </span>
        )}
      </div>
    </div>
  );
}
