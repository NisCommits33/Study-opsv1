/**
 * @file AssistantSidebar.tsx
 * @description AI Assistant Sidebar following the StudyOps Design System.
 * Implements the Teal/Navy chat bubble aesthetic and premium animations.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useAssistantStore, Message } from '@/store/useAssistantStore'
import { getAssistantResponseAction } from '@/app/actions/ai.actions'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Bot, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AssistantSidebar() {
  const { isOpen, toggleSidebar, messages, addMessage, isLoading, setLoading, clearChat } = useAssistantStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    addMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      const response = await getAssistantResponseAction([...messages, userMessage])

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString()
      }
      addMessage(assistantMessage)
    } catch (error: any) {
      console.error('AI Error:', error)
      addMessage({
        role: 'assistant',
        content: `Error: ${error.message || 'I encountered an unknown error. Please check your API keys or try again later.'}`,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-40"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-8 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal/10 flex items-center justify-center border border-teal/20">
                  <Bot className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <h3 className="font-display text-xl flex items-center gap-2 text-foreground">
                    Study Assistant
                  </h3>
                  <p className="font-mono text-[9px] text-teal uppercase tracking-widest">Always active</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-rose transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleSidebar}
                  className="p-2.5 rounded-xl hover:bg-muted text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Chat History */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-display max-w-[220px] text-foreground">
                    Ask me about your shifts, subjects, or study plans.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-2 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "font-mono text-[9px] uppercase tracking-widest",
                    msg.role === 'user' ? "text-primary opacity-60" : "text-teal opacity-60"
                  )}>
                    {msg.role === 'user' ? 'Scholar' : 'StudyOps AI'} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className={cn(
                    "p-4 text-sm leading-relaxed",
                    msg.role === 'user'
                      ? "bg-primary/10 text-primary border border-primary/20 rounded-2xl rounded-tr-none"
                      : "bg-muted/30 border border-border text-foreground rounded-2xl rounded-tl-none border-l-2 border-l-teal"
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex flex-col gap-2 mr-auto items-start w-3/4">
                  <div className="font-mono text-[9px] text-teal opacity-60 uppercase tracking-widest animate-pulse">Thinking...</div>
                  <Skeleton className="h-24 w-full rounded-2xl rounded-tl-none bg-muted/20" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-muted/10 border-t border-border">
              <div className="relative flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your question..."
                  className="w-full bg-background border border-border p-4 pr-14 rounded-2xl focus:ring-2 focus:ring-teal outline-none transition-all placeholder:text-muted-foreground/50 text-sm text-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2.5 bg-teal text-background rounded-xl hover:opacity-90 disabled:opacity-30 transition-all shadow-lg shadow-teal/10"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
