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
import { Play, Pause, RotateCcw, Coffee, Zap, BookOpen, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Timer Component.
 */
export default function Timer() {
  const { mode, timeLeft, isActive, toggle, reset, setMode } = useTimerStore()
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<any[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [currentBlock, setCurrentBlock] = useState<any>(null)
  const [nextBlock, setNextBlock] = useState<any>(null)

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [subRes, planRes] = await Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('daily_plans').select('*').eq('user_id', user.id).eq('date', new Date().toISOString().split('T')[0]).eq('status', 'active').single()
    ])

    if (subRes.data) {
      setSubjects(subRes.data)
      if (subRes.data.length > 0) setSelectedSubject(subRes.data[0].id)
    }

    if (planRes.data?.plan_json?.blocks) {
      const now = new Date()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      const blocks = planRes.data.plan_json.blocks
      
      const current = blocks.find((b: any) => b.start <= timeStr && b.end >= timeStr)
      if (current) {
        setCurrentBlock(current)
        if (current.subject_id) setSelectedSubject(current.subject_id)
      }
      
      const next = blocks.find((b: any) => b.start > timeStr)
      if (next) setNextBlock(next)
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
        <h1 className="text-4xl font-display text-foreground tracking-tight">Focus Engine</h1>
        <div className="label-mono opacity-60">Deep work session in progress</div>
      </header>

      {currentBlock && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 px-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-4 max-w-md w-full">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                <Target className="w-5 h-5" />
            </div>
            <div>
                <div className="label-mono text-primary">Currently Scheduled</div>
                <div className="text-sm font-bold text-foreground">{currentBlock.topic}</div>
            </div>
        </motion.div>
      )}

      {/* Timer Circle */}
      <div className="relative group">
        <div className={cn(
          "absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000",
          mode === 'focus' ? "bg-primary animate-pulse" : "bg-teal"
        )} />
        
        <div className="w-80 h-80 rounded-full bg-card border-8 border-border flex flex-col items-center justify-center relative z-10 shadow-2xl overflow-hidden">
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
            <div className={cn(
              "label-mono mb-2",
              mode === 'focus' ? "text-primary" : "text-teal"
            )}>
              {mode === 'focus' ? 'Focus Mode' : 'Short Break'}
            </div>
            <div className="text-8xl font-display text-foreground tracking-tighter">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        <button 
          onClick={reset}
          className="p-5 bg-muted/20 rounded-2xl hover:bg-muted/40 transition-all text-muted-foreground"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        <button 
          onClick={toggle}
          className={cn(
            "w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all",
            isActive ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          {isActive ? <Pause className="w-12 h-12" fill="currentColor" /> : <Play className="w-12 h-12 ml-1" fill="currentColor" />}
        </button>
        <button 
          onClick={() => setMode(mode === 'focus' ? 'break' : 'focus')}
          className="p-5 bg-muted/20 rounded-2xl hover:bg-muted/40 transition-all text-muted-foreground"
        >
          {mode === 'focus' ? <Coffee className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
        </button>
      </div>

      {/* Subject Selection */}
      <section className="w-full max-w-md bg-card border border-border p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg flex items-center gap-3 text-foreground">
            <BookOpen className="w-5 h-5 text-primary" />
            Subject Area
          </h3>
          <div className="label-mono">Active Focus</div>
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
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-transparent bg-muted/20 hover:bg-muted/40 text-muted-foreground"
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

        {nextBlock && (
            <div className="pt-6 border-t border-border flex items-center justify-between">
                <div className="label-mono opacity-60">Next Up</div>
                <div className="text-[10px] font-bold text-foreground">
                    {nextBlock.start} · {nextBlock.topic}
                </div>
            </div>
        )}
      </section>
    </main>
  )
}
