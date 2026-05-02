'use client'

import { motion } from 'framer-motion'
import { Search, Home, ArrowLeft, Ghost } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-10"
      >
        {/* 404 Illustration */}
        <div className="relative mx-auto w-32 h-32">
          <motion.div 
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute -top-4 -right-4 w-12 h-12 bg-primary/20 rounded-full blur-xl" 
          />
          <div className="relative w-full h-full bg-card border border-border rounded-[2.5rem] flex items-center justify-center shadow-2xl">
            <Ghost className="w-16 h-16 text-primary" />
          </div>
          <div className="absolute -bottom-2 -left-2 px-3 py-1 bg-rose text-white text-[10px] font-bold rounded-lg rotate-[-12deg] shadow-lg">
            404
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Lost in Space?</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            The page you are looking for has been moved, deleted, or never existed in this dimension.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-3 p-5 bg-primary text-primary-foreground rounded-[2rem] text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Home className="w-4 h-4" /> Return to Command Center
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-3 p-5 bg-card border border-border text-foreground rounded-[2rem] text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>

        <div className="pt-10 flex items-center justify-center gap-6 opacity-30">
            <div className="h-px flex-1 bg-border" />
            <Search className="w-4 h-4 text-muted-foreground" />
            <div className="h-px flex-1 bg-border" />
        </div>
      </motion.div>
    </div>
  )
}
