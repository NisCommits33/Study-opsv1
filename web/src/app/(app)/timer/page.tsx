/**
 * @file timer/page.tsx
 * @description Pomodoro Focus Timer with global state persistency.
 * 
 * @author Study Ops Engineering
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTimerStore } from '@/store/useTimerStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Zap, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Timer Component.
 */
export default function Timer() {
  const { mode, timeLeft, isActive, toggle, reset, setMode } = useTimerStore()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')

  useEffect(() => {
    fetchSubjects()
  }, [])

  /**
   * Handle session auto-logging when timer reaches zero.
   */
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      handleComplete()
    }
  }, [timeLeft])

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*')
    if (data) {
      setSubjects(data)
      if (data.length > 0) setSelectedSubject(data[0].id)
    }
    setLoading(false)
  }

  const handleComplete = async () => {
    if (mode === 'focus') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && selectedSubject) {
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          subject_id: selectedSubject,
          duration_minutes: 25,
          mood: 3,
          efficiency_score: 80
        })
      }
      alert('Focus session complete!')
      setMode('break')
    } else {
      alert('Break over!')
      setMode('focus')
    }
    reset()
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Skeleton className="w-80 h-80 rounded-full" />
      </div>
    )
  }

  return (
    <main className="p-10 max-w-4xl mx-auto space-y-12 flex flex-col items-center">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-display text-white uppercase tracking-tight">Focus Engine</h1>
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">Deep work session in progress</p>
      </header>

      {/* Timer Circle */}
      <div className="relative group">
        <div className={cn(
          "absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000",
          mode === 'focus' ? "bg-saffron animate-pulse" : "bg-teal"
        )} />
        
        <div className="w-80 h-80 rounded-full bg-navy-light border-8 border-white/5 flex flex-col items-center justify-center relative z-10 shadow-2xl overflow-hidden">
          <motion.div 
            animate={{ 
              height: `${(timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60)) * 100}%` 
            }}
            className={cn(
              "absolute bottom-0 left-0 right-0 z-0 transition-all duration-1000 opacity-10",
              mode === 'focus' ? "bg-saffron" : "bg-teal"
            )}
          />
          
          <div className="relative z-10 text-center">
            <span className={cn(
              "font-mono text-[10px] uppercase tracking-[0.3em] mb-2 block",
              mode === 'focus' ? "text-saffron" : "text-teal"
            )}>
              {mode === 'focus' ? 'Focus Mode' : 'Short Break'}
            </span>
            <div className="text-8xl font-display text-white tracking-tighter">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button 
          onClick={reset}
          className="p-5 bg-navy-lighter rounded-2xl hover:bg-white/5 transition-all text-muted-foreground"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={toggle}
          className={cn(
            "w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all",
            isActive ? "bg-navy-lighter text-white" : "bg-saffron text-navy"
          )}
        >
          {isActive ? <Pause className="w-12 h-12" fill="currentColor" /> : <Play className="w-12 h-12 ml-1" fill="currentColor" />}
        </button>
        <button 
          onClick={() => setMode(mode === 'focus' ? 'break' : 'focus')}
          className="p-5 bg-navy-lighter rounded-2xl hover:bg-white/5 transition-all text-muted-foreground"
        >
          {mode === 'focus' ? <Coffee className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </button>
      </div>

      {/* Subject Selection */}
      <section className="w-full max-w-md glass p-8 rounded-[2.5rem] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-saffron" />
            Subject Area
          </h3>
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Active Focus</span>
        </div>
        
        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-sm font-bold transition-all text-left flex justify-between items-center",
                  selectedSubject === sub.id 
                    ? "border-saffron bg-saffron/10 text-saffron" 
                    : "border-transparent bg-background hover:bg-white/5 text-muted-foreground"
                )}
              >
                {sub.name}
                {selectedSubject === sub.id && <Zap className="w-4 h-4 fill-current" />}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground italic py-4">
            No subjects added yet.
          </p>
        )}
      </section>
    </main>
  )
}
