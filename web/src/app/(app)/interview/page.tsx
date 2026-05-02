/**
 * @file interview/page.tsx
 * @description Interview Prep Command Center & STAR Builder.
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Mic, 
  MessageSquare, 
  Award, 
  ShieldCheck, 
  History, 
  Sparkles, 
  Brain, 
  Plus, 
  ChevronRight,
  Target,
  Bot,
  LayoutGrid,
  FileText,
  Star,
  Zap,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from 'sonner'
export default function InterviewPrep() {
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<any[]>([])
  const [showStarModal, setShowStarModal] = useState(false)
  
  // STAR Form State
  const [starData, setStarData] = useState({
    question: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    language: 'en'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: ansData } = await supabase.from('interview_answers').select('*').order('created_at', { ascending: false })
    setAnswers(ansData || [])
    setLoading(false)
  }

  const handleSaveStar = async () => {
    if (!starData.question || !starData.situation) {
        toast.error("Please fill in the question and situation")
        return
    }

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('interview_answers').insert({
            user_id: user.id,
            question: { en: starData.question, np: "" },
            star_format: {
                situation: starData.situation,
                task: starData.task,
                action: starData.action,
                result: starData.result
            },
            is_saved: true
        })

        if (error) throw error
        toast.success("STAR answer saved to bank")
        setShowStarModal(false)
        fetchData()
        setStarData({ question: '', situation: '', task: '', action: '', result: '', language: 'en' })
    } catch (err: any) {
        toast.error(err.message)
    }
  }

  if (loading) return <div className="p-10 space-y-10 bg-background h-screen"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><Skeleton className="h-64 rounded-[3rem]" /><Skeleton className="h-64 rounded-[3rem]" /></div></div>

  return (
    <main className="p-10 max-w-7xl mx-auto space-y-12 pb-32 text-foreground bg-background">
      
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-foreground tracking-tight leading-none">Interview Prep</h1>
          <p className="text-muted-foreground text-sm">Master your story using the STAR method.</p>
        </div>
      </header>

      <div className="space-y-12">
          {/* STAR Builder Section */}
          <header className="flex items-center justify-between">
              <div>
                  <h2 className="text-2xl font-bold text-foreground">STAR Bank</h2>
                  <p className="text-sm text-muted-foreground">Store your best behavioral stories to never get caught off guard.</p>
              </div>
              <button 
                  onClick={() => setShowStarModal(true)}
                  className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                  <Star className="w-4 h-4 fill-current" /> Build New STAR Story
              </button>
          </header>

          {answers.length === 0 ? (
              <EmptyState 
                  icon={Star}
                  title="No STAR Stories Saved"
                  description="The STAR method (Situation, Task, Action, Result) is the gold standard for behavioral interviews. Start building your library now."
                  action={{
                      label: "Build Your First Story",
                      onClick: () => setShowStarModal(true),
                      icon: Plus
                  }}
              />
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {answers.map((ans) => (
                      <div key={ans.id} className="group p-8 rounded-[2.5rem] bg-card border border-border hover:bg-muted/5 hover:border-primary/20 transition-all shadow-sm space-y-6">
                          <div className="flex justify-between items-start">
                              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><FileText className="w-5 h-5" /></div>
                              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">STAR Entry</span>
                          </div>
                          <h3 className="text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{ans.question?.en}</h3>
                          <div className="space-y-3">
                              <div className="flex gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">S</span>
                                  <p className="text-xs text-muted-foreground line-clamp-2">{ans.star_format?.situation}</p>
                              </div>
                              <div className="flex gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">R</span>
                                  <p className="text-xs text-emerald-500/80 line-clamp-2 font-medium">{ans.star_format?.result}</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* ── STAR Builder Modal ── */}
      <AnimatePresence>
        {showStarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/90 backdrop-blur-md" onClick={() => setShowStarModal(false)} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-card w-full max-w-2xl p-12 rounded-[3rem] border border-border shadow-2xl space-y-10 my-auto"
            >
              <div className="space-y-1">
                <h3 className="text-3xl font-bold flex items-center gap-3 text-foreground">STAR Builder</h3>
                <p className="text-sm text-muted-foreground">Structure your experience into a powerful response.</p>
              </div>
              
              <div className="space-y-6">
                  {/* Question */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">Interview Question</label>
                    <textarea 
                        value={starData.question}
                        onChange={e => setStarData({...starData, question: e.target.value})}
                        placeholder="e.g. Tell me about a time you handled a conflict at work."
                        className="w-full p-4 bg-muted/20 border border-border rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground h-24 resize-none" 
                    />
                  </div>

                  {/* STAR Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">Situation (Context)</label>
                        <textarea 
                            value={starData.situation}
                            onChange={e => setStarData({...starData, situation: e.target.value})}
                            placeholder="What happened?"
                            className="w-full p-4 bg-muted/20 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground h-32 resize-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">Task (Challenge)</label>
                        <textarea 
                            value={starData.task}
                            onChange={e => setStarData({...starData, task: e.target.value})}
                            placeholder="What was your goal?"
                            className="w-full p-4 bg-muted/20 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground h-32 resize-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">Action (What you did)</label>
                        <textarea 
                            value={starData.action}
                            onChange={e => setStarData({...starData, action: e.target.value})}
                            placeholder="Specific steps you took."
                            className="w-full p-4 bg-muted/20 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground h-32 resize-none" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2">Result (Outcome)</label>
                        <textarea 
                            value={starData.result}
                            onChange={e => setStarData({...starData, result: e.target.value})}
                            placeholder="The successful ending."
                            className="w-full p-4 bg-muted/20 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-foreground h-32 resize-none" 
                        />
                    </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowStarModal(false)} className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-muted rounded-2xl transition-colors text-muted-foreground">Cancel</button>
                <button 
                    onClick={handleSaveStar}
                    className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/10 uppercase tracking-widest text-[10px]"
                >
                    Save to STAR Bank
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
