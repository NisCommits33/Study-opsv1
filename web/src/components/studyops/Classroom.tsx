/**
 * @file components/studyops/Classroom.tsx
 * @description Interactive AI Classroom for Study Ops.
 * Features an AI teacher, virtual whiteboard, and classmates.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  Users, 
  Presentation, 
  Volume2, 
  MessageSquare, 
  ChevronRight, 
  X,
  Sparkles,
  BookOpen,
  ArrowRight,
  Play,
  Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClassroomProps {
  topic: {
    title: string
    content: string
  }
  onComplete: () => void
}

export function Classroom({ topic, onComplete }: ClassroomProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTeaching, setIsTeaching] = useState(false)
  
  // Simulated Slide content (AI would generate this from topic.content)
  const slides = [
    { title: "Introduction", content: topic.content.slice(0, 300) + "..." },
    { title: "Core Concepts", content: "Key points from " + topic.title },
    { title: "Summary", content: "Wrapping up the session." }
  ]

  useEffect(() => {
    startLesson()
  }, [])

  const startLesson = async () => {
    setIsTeaching(true)
    setMessages([{ 
      role: 'teacher', 
      name: 'Dr. AI', 
      content: `Namaste! I am your AI Tutor. Today we are exploring "${topic.title}". Let's look at the whiteboard.` 
    }])
    await new Promise(r => setTimeout(r, 2000))
    setMessages(prev => [...prev, { 
      role: 'student', 
      name: 'Scholar Bot', 
      content: 'I have a question about the first part!' 
    }])
    setIsTeaching(false)
  }

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl rounded-[2.5rem] border border-border overflow-hidden relative">
      
      {/* ── Virtual Whiteboard (Visual Area) ── */}
      <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden">
        <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><Presentation className="w-5 h-5" /></div>
                <h3 className="text-sm font-bold text-foreground">Interactive Whiteboard</h3>
            </div>
            <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                    <div key={i} className={cn("h-1 rounded-full transition-all", i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted")} />
                ))}
            </div>
        </header>

        <motion.div 
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-background/50 border border-border rounded-[2rem] p-10 relative overflow-hidden group shadow-inner"
        >
            <div className="absolute top-0 left-0 p-8 opacity-5">
                <Sparkles className="w-32 h-32 text-primary" />
            </div>
            <div className="relative z-10 space-y-6">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{slides[currentSlide].title}</h2>
                <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed text-lg">
                    {slides[currentSlide].content}
                </div>
            </div>
            <div className="absolute bottom-8 right-8">
                <button 
                    onClick={handleNextSlide}
                    className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </motion.div>
      </div>

      {/* ── Classroom Chat (Bottom Bar) ── */}
      <div className="h-64 border-t border-border bg-card/50 p-6 flex gap-6">
          {/* Teacher Section */}
          <div className="w-1/3 flex gap-4 border-r border-border pr-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Bot className="w-10 h-10" />
            </div>
            <div className="space-y-2 overflow-hidden">
                <div className="text-[10px] font-mono text-primary uppercase tracking-widest">AI TEACHER</div>
                <div className="text-xs text-foreground leading-relaxed line-clamp-4 italic">
                    "{messages.find(m => m.role === 'teacher')?.content}"
                </div>
            </div>
          </div>

          {/* Student Interaction / Classmates */}
          <div className="flex-1 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-4 min-w-max">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground/30"><Users className="w-6 h-6" /></div>
                    <div className="space-y-1">
                        <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Classmates (4)</div>
                        <div className="flex -space-x-2">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px]">🤖</div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="h-12 w-px bg-border mx-4" />
                <div className="flex-1 min-w-[200px] bg-muted/20 border border-border rounded-2xl p-4 relative flex items-center">
                    <MessageSquare className="w-4 h-4 text-muted-foreground/40 mr-3" />
                    <input 
                        placeholder="Ask the teacher something..."
                        className="bg-transparent border-none outline-none text-xs text-foreground w-full placeholder:text-muted-foreground/20"
                    />
                    <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><ArrowRight className="w-4 h-4" /></button>
                </div>
          </div>
      </div>
    </div>
  )
}
