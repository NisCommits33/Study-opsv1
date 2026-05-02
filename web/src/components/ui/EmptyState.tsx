/**
 * @file components/ui/EmptyState.tsx
 * @description A high-fidelity reusable empty state component.
 */

'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  className?: string
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center bg-muted/5 border-2 border-dashed border-border rounded-[3rem] space-y-8 min-h-[400px]",
      className
    )}>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-24 h-24 bg-card border border-border rounded-[2rem] flex items-center justify-center shadow-xl">
          <Icon className="w-10 h-10 text-primary/40" />
        </div>
      </motion.div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-foreground tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  )
}
