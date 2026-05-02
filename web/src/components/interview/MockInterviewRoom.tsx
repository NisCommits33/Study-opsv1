/**
 * @file components/interview/MockInterviewRoom.tsx
 * @description Interactive mock interview interface with AI roleplay.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  User, 
  Send, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Trophy,
  AlertCircle,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface MockInterviewRoomProps {
  context: 'loksewa' | 'arff_promotion' | 'general'
  onClose: () => void
}

export function MockInterviewRoom({ context, onClose }: MockInterviewRoomProps) {
  const [step, setStep] = useState<'intro' | 'qa' | 'summary'>('intro')
  const [messages, setMessages] = useState<any[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [sessionScore, setSessionScore] = useState(0)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 'intro') {
      simulateAIResponse("Namaste! I am your AI Examiner. I'll be conducting your mock interview today for the " + context.replace('_', ' ') + " context. Are you ready to begin?")
    }
  }, [step])

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const simulateAIResponse = async (text: string) => {
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 1500))
    setMessages(prev => [...prev, { role: 'assistant', content: text }])
    setIsTyping(false)
  }

  const handleSend = async () => {
    if (!currentInput.trim()) return
    const userMsg = currentInput
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setCurrentInput('')

    if (step === 'intro') {
      setStep('qa')
      simulateAIResponse("Great. Let's start with a basic one: Can you tell me about your background and why you are interested in this position?")
      return
    }

    // In a real app, this would call an AI action to evaluate and ask the next question
    setIsTyping(true)
    await new Promise(r => setTimeout(r, 2000))
    
    const nextQuestions = [
        "How would you handle a high-pressure situation during an aircraft emergency?",
        "What are the core principles of fire chemistry according to your notes?",
        "Describe a time you showed leadership in a team setting."
    ]

    if (currentQuestionIndex < nextQuestions.length) {
        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Thank you for that answer. Next question: " + nextQuestions[currentQuestionIndex],
            feedback: "Good structured response, but try to be more specific about the outcomes."
        }])
        setCurrentQuestionIndex(prev => prev + 1)
        setSessionScore(prev => prev + 15)
    } else {
        setStep('summary')
    }
    setIsTyping(false)
  }

  return (
    <div className="fixed inset-0 z-[110] bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Bot className="w-6 h-6" /></div>
            <div>
                <h3 className="text-sm font-bold text-foreground">AI Mock Interview</h3>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{context.replace('_', ' ')} · Text Mode</div>
            </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground"><X className="w-5 h-5" /></button>
      </header>

      {/* Main Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col max-w-4xl mx-auto w-full">
        
        {step !== 'summary' ? (
            <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth pb-32">
                    {messages.map((msg, i) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={i} 
                            className={cn(
                                "flex gap-4 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                                msg.role === 'assistant' ? "bg-card border-border text-primary" : "bg-primary border-primary text-primary-foreground"
                            )}>
                                {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div className="space-y-3">
                                <div className={cn(
                                    "p-6 rounded-[2rem] text-sm leading-relaxed shadow-sm",
                                    msg.role === 'assistant' ? "bg-card border border-border text-foreground rounded-tl-none" : "bg-primary/5 border border-primary/10 text-foreground rounded-tr-none"
                                )}>
                                    {msg.content}
                                </div>
                                {msg.feedback && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-teal/5 border border-teal/20 rounded-2xl text-[10px] text-teal font-medium uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3" /> {msg.feedback}
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-card border border-border rounded-2xl flex items-center justify-center text-primary shadow-sm"><Bot className="w-5 h-5" /></div>
                            <div className="p-6 bg-card border border-border rounded-[2rem] rounded-tl-none shadow-sm flex gap-1">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-background via-background/95 to-transparent">
                    <div className="relative">
                        <input 
                            value={currentInput}
                            onChange={e => setCurrentInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Type your response..."
                            className="w-full p-6 bg-card border border-border rounded-[2.5rem] pr-20 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 shadow-xl transition-all text-foreground"
                        />
                        <button 
                            onClick={handleSend}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-primary text-primary-foreground rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-12"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
                    <div className="relative w-32 h-32 bg-card border border-border rounded-[3rem] flex items-center justify-center shadow-2xl">
                        <Trophy className="w-16 h-16 text-primary" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-foreground tracking-tight">Interview Complete!</h2>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">Great performance. You handled {currentQuestionIndex} questions with an overall confidence score of {sessionScore}%.</p>
                </div>

                <div className="grid grid-cols-2 gap-6 w-full max-w-md">
                    <div className="p-6 bg-card border border-border rounded-3xl space-y-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Strength</div>
                        <div className="text-sm font-bold text-teal">Situational Logic</div>
                    </div>
                    <div className="p-6 bg-card border border-border rounded-3xl space-y-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Weakness</div>
                        <div className="text-sm font-bold text-rose">Hesitation (Rules)</div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-sm">
                    <button onClick={onClose} className="w-full p-5 bg-primary text-primary-foreground rounded-[2rem] text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Save & Exit Session</button>
                    <button onClick={() => setStep('intro')} className="w-full p-5 bg-card border border-border text-foreground rounded-[2rem] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-muted transition-all">Review Answers</button>
                </div>
            </motion.div>
        )}
      </div>
    </div>
  )
}
