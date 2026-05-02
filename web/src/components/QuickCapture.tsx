/**
 * @file QuickCapture.tsx
 * @description Global floating action button for quick study capture (Text/Voice).
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  X, 
  Mic, 
  Type, 
  Loader2, 
  Check, 
  Tag, 
  Save,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Scroll Lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])


  const handleSave = async () => {
    if (!content.trim()) return
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Unauthorized")

      const { error } = await supabase.from('capture_inbox').insert({
        user_id: user.id,
        content,
        type: 'quick_note'
      })

      if (error) throw error
      
      toast.success("Captured to Inbox!")
      setIsOpen(false)
      setContent('')
    } catch (err: any) {
      toast.error("Save failed: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Floating Trigger */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-10 right-10 z-[100] w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-background/90 backdrop-blur-md" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative bg-card w-full max-w-2xl p-10 rounded-[3rem] border border-border shadow-3xl space-y-8 overflow-hidden"
            >
              {/* Magic Glow Background */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold flex items-center gap-3 text-foreground">
                     Quick Capture
                  </h3>
                  <p className="text-sm text-muted-foreground">Instantly log a study thought.</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-3 hover:bg-muted rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>


              {/* Input Area */}
              <div className="space-y-6">
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? Capture it now, organize it later."
                  className="w-full h-48 p-6 bg-muted/20 border border-border rounded-[2rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground resize-none"
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-muted rounded-[2rem] transition-all text-muted-foreground"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!content.trim() || isSaving}
                  className="flex-[2] py-5 bg-primary text-primary-foreground rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-30"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save to Capture Inbox
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
