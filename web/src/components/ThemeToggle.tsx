/**
 * @file ThemeToggle.tsx
 * @description A premium theme switcher toggle with smooth animations.
 * 
 * @author Study Ops Engineering
 */

'use client'

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
      aria-label="Toggle Theme"
    >
      <div className="relative w-5 h-5 overflow-hidden">
        <motion.div
          animate={{ y: theme === "dark" ? 0 : 30 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <Moon className="w-5 h-5 text-saffron" />
        </motion.div>
        <motion.div
          initial={{ y: -30 }}
          animate={{ y: theme === "light" ? -20 : -50 }}
          transition={{ type: "spring", damping: 15 }}
          className="absolute top-5 left-0"
        >
          <Sun className="w-5 h-5 text-saffron" />
        </motion.div>
      </div>
      
      {/* Subtle Glow */}
      <div className="absolute inset-0 rounded-xl bg-saffron/0 group-hover:bg-saffron/5 transition-colors" />
    </button>
  )
}
