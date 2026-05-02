/**
 * @file Skeleton.tsx
 * @description Loading placeholder component.
 * Provides a pulsed animation for UI loading states.
 * 
 * @author Study Ops Engineering
 */

import { cn } from "@/lib/utils"

/**
 * Skeleton component for showing loading placeholders.
 * 
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard HTML div attributes.
 * @returns {JSX.Element} The rendered skeleton placeholder.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      {...props}
    />
  )
}
