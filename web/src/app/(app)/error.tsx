/**
 * @file app/(app)/error.tsx
 * @description Protected layout error boundary — catches errors in the authenticated area.
 */

'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-10">
      <div className="text-center space-y-8 max-w-md">
        <div className="w-20 h-20 bg-rose/10 rounded-3xl flex items-center justify-center mx-auto border border-rose/20">
          <AlertTriangle className="w-10 h-10 text-rose" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Module Error</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{error.message || 'This section encountered an issue. Your data is safe.'}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-muted text-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-muted/80 transition-all flex items-center gap-3"
          >
            <Home className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
