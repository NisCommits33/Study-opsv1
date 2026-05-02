/**
 * @file app/error.tsx
 * @description Global error boundary — catches unhandled errors app-wide.
 */

'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-10">
      <div className="text-center space-y-8 max-w-md">
        <div className="w-20 h-20 bg-rose/10 rounded-3xl flex items-center justify-center mx-auto border border-rose/20">
          <AlertTriangle className="w-10 h-10 text-rose" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{error.message || 'An unexpected error occurred. Please try again.'}</p>
        </div>
        <button
          onClick={reset}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  )
}
