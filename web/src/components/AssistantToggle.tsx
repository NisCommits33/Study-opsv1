/**
 * @file AssistantToggle.tsx
 * @description Floating toggle button for the AI Assistant.
 * Provides a persistent entry point to the assistant sidebar.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useAssistantStore } from '@/store/useAssistantStore'
import { Bot, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * AssistantToggle Component.
 * A premium floating action button (FAB) that triggers the sidebar.
 */
export function AssistantToggle() {
  const { toggleSidebar, isOpen } = useAssistantStore()

  if (isOpen) return null

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleSidebar}
      className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl flex items-center justify-center z-40 group neon-border overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Bot className="w-8 h-8 relative z-10" />
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5] 
        }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute -top-1 -right-1"
      >
        <Sparkles className="w-5 h-5 text-white/50" />
      </motion.div>
    </motion.button>
  )
}
