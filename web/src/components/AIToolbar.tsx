/**
 * @file AIToolbar.tsx
 * @description Floating AI toolbar for the documentation reader.
 * Appears when text is selected and provides contextual actions.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Languages, Zap, Loader2 } from 'lucide-react'
import { chatAction } from '@/app/actions/ai.actions'
import { toast } from 'sonner'

/**
 * Props for the ActionButton component.
 */
interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

/**
 * Floating AI toolbar that appears upon text selection.
 * 
 * @param {Object} props - Component properties.
 * @param {Function} props.onInsert - Callback when an AI action produces a result.
 */
export function AIToolbar({ onInsert }: AIToolbarProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length > 5) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()

        if (rect) {
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY - 10
          })
          setSelectedText(text)
          setIsVisible(true)
        }
      } else {
        setIsVisible(false)
      }
    }

    const handleMouseDown = () => {
      setIsVisible(false)
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  const handleAction = async (action: 'eli5' | 'summarize' | 'translate') => {
    setIsLoading(true)
    try {
      let prompt = ""
      if (action === 'eli5') {
        prompt = `Explain this text like I'm 5 years old. Keep it simple and engaging:\n\n${selectedText}`
      } else if (action === 'summarize') {
        prompt = `Summarize this text into concise bullet points:\n\n${selectedText}`
      } else if (action === 'translate') {
        prompt = `Translate this text into academic Nepali:\n\n${selectedText}`
      }

      const response = await chatAction([{ role: 'user', content: prompt }], 'simple')
      onInsert(response.text)
      setIsVisible(false)
    } catch (error) {
      toast.error('AI Action failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          style={{ 
            position: 'absolute', 
            left: position.x, 
            top: position.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
          className="z-[100] flex items-center gap-1 p-1.5 bg-card border border-border rounded-2xl shadow-2xl backdrop-blur-xl"
        >
          {isLoading ? (
            <div className="px-4 py-2 flex items-center gap-2 text-xs font-bold text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Selection...
            </div>
          ) : (
            <>
              <ActionButton 
                icon={<Brain className="w-4 h-4" />} 
                label="ELI5" 
                onClick={() => handleAction('eli5')} 
              />
              <div className="w-[1px] h-4 bg-border mx-1" />
              <ActionButton 
                icon={<Zap className="w-4 h-4" />} 
                label="Summarize" 
                onClick={() => handleAction('summarize')} 
              />
              <div className="w-[1px] h-4 bg-border mx-1" />
              <ActionButton 
                icon={<Languages className="w-4 h-4" />} 
                label="Nepali" 
                onClick={() => handleAction('translate')} 
              />
            </>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted rounded-xl transition-all group"
    >
      <span className="text-muted-foreground group-hover:text-primary transition-colors">
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
  )
}
