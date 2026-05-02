'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCcw, Home, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Animated Error Icon */}
        <div className="relative mx-auto w-24 h-24">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute inset-0 bg-rose/10 rounded-full blur-2xl" 
          />
          <div className="relative w-full h-full bg-card border border-border rounded-[2rem] flex items-center justify-center shadow-xl">
            <AlertTriangle className="w-10 h-10 text-rose" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We encountered an unexpected error while processing your request. Our team has been notified.
          </p>
        </div>

        {/* Error Detail (Optional/Debug) */}
        <div className="p-4 bg-muted/20 rounded-2xl border border-border text-[10px] font-mono text-muted-foreground break-all text-left">
          {error.message || "An unknown system error occurred."}
          {error.digest && <div className="mt-2 opacity-50">Digest: {error.digest}</div>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 p-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            <RefreshCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 p-4 bg-card border border-border text-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
        </div>

        <p className="text-[9px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2 pt-8">
          <MessageSquare className="w-3 h-3" /> Need help? Contact Support
        </p>
      </motion.div>
    </div>
  )
}
